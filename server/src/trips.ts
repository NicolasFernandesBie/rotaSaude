import { db } from "./db";

export const RETURN_OFFSET_HOURS = 6;

type TripInput = {
  departureAt: Date;
  originCity: string;
  destinationCity: string;
  vehicle: string;
  driver: string;
  phone?: string | null;
  capacity: number;
  notes?: string | null;
};

export function returnDepartureAt(idaDepartureAt: Date): Date {
  return new Date(idaDepartureAt.getTime() + RETURN_OFFSET_HOURS * 3_600_000);
}

export async function createTripPair(input: TripInput) {
  const outbound = await db.trip.create({
    data: {
      departureAt: input.departureAt,
      originCity: input.originCity,
      destinationCity: input.destinationCity,
      vehicle: input.vehicle,
      driver: input.driver,
      phone: input.phone ?? null,
      capacity: input.capacity,
      tripKind: "IDA",
      notes: input.notes ?? null,
    },
  });

  const ret = await db.trip.create({
    data: {
      departureAt: returnDepartureAt(input.departureAt),
      originCity: input.destinationCity,
      destinationCity: input.originCity,
      vehicle: input.vehicle,
      driver: input.driver,
      phone: input.phone ?? null,
      capacity: input.capacity,
      tripKind: "VOLTA",
      parentTripId: outbound.id,
      notes: `Retorno da viagem de ida (${input.originCity} -> ${input.destinationCity})`,
    },
  });

  return { outbound, returnTrip: ret };
}
