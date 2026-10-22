"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ErrorBox, PageHeader, Spinner } from "@/components/ui";
import { useLocalFlag } from "@/lib/hooks/useLocalFlag";
import { useNow } from "@/lib/hooks/useNow";
import { useApi } from "@/lib/useApi";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import {
  HelpBanner,
  NotificationsCard,
  QueueCard,
  TodaySummaryCard,
  TripCarousel,
} from "@/features/dashboard/components";
import { useAssignActions } from "@/features/referrals/hooks/useAssignActions";
import { useTripMutations } from "@/features/trips/hooks/useTripMutations";
import type { TripSuggestions } from "@/features/referrals/types";

const HELP_KEY = "rota-saude-ajuda-v1";

export default function AgoraPage() {
  const { data, error, loading, reload } = useDashboard();
  const upcoming = data?.upcomingTrips ?? [];
  const [tripIndex, setTripIndex] = useState(0);
  const clampedIndex = upcoming.length ? Math.min(tripIndex, upcoming.length - 1) : 0;
  const trip = upcoming[clampedIndex] ?? null;
  const tripId = trip?.id;

  const { data: sugData, loading: sugLoading, reload: reloadSug } = useApi<TripSuggestions>(
    tripId ? `/api/trips/${tripId}/suggestions` : null,
  );

  const help = useLocalFlag(HELP_KEY);
  const now = useNow();
  const trips = useTripMutations(reload);
  const assign = useAssignActions(reload, reloadSug);

  function irParaViagem(delta: number) {
    setTripIndex((i) => Math.max(0, Math.min(upcoming.length - 1, i + delta)));
  }

  if (loading) return <Spinner label="Carregando..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const fila = data.queue;
  const primeiraCidade = fila[0]?.destinationCity;
  const createTripHref = primeiraCidade
    ? `/transportes/novo?city=${encodeURIComponent(primeiraCidade)}`
    : "/transportes/novo";

  return (
    <div>
      <PageHeader
        title="Agora"
        subtitle="O que precisa da sua atenção hoje"
        actions={
          <Link href="/novo">
            <Button>+ Novo atendimento</Button>
          </Link>
        }
      />

      {help.visible ? <HelpBanner onDismiss={help.dismiss} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <TripCarousel
          trips={upcoming}
          index={clampedIndex}
          now={now}
          tripBusy={trips.busy}
          sugData={sugData}
          sugLoading={sugLoading}
          filling={assign.filling}
          addingId={assign.addingId}
          onNavigate={irParaViagem}
          onStart={trips.startLeg}
          onStartReturn={trips.startReturn}
          onAddSuggestion={(s) => tripId && assign.addSuggestion(s, tripId)}
          onFill={() =>
            trip && assign.fillTrip(trip.id, sugData?.freeSeats ?? 0, sugData?.suggestions.length ?? 0)
          }
          createTripHref={createTripHref}
        />
        <TodaySummaryCard data={data} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <QueueCard queue={fila} busyId={assign.reservingId} onReserve={assign.reserve} />
        <NotificationsCard notifications={data.recentNotifications} />
      </div>
    </div>
  );
}
