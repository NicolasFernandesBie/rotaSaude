import { db } from "./db";
import {
  buildMessage,
  tripMessageContext,
  queueNotification,
  DEFAULT_SETTINGS,
} from "./notifications";
import { returnDepartureAt } from "./trips";

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}

const CIDADE_ORIGEM = "Avaré";

const unidades: Record<string, string[]> = {
  Bauru: ["Hospital Santa Casa de Bauru", "Centro de Imagem Bauru", "Ortocentro Bauru"],
  Botucatu: ["Unimaged Botucatu", "Unidade Rehabilita Botucatu", "HC Botucatu"],
  "São Carlos": ["Hospital Amaral Carvalho", "Instituto de Nefrologia São Carlos"],
  Marília: ["Hospital das Clínicas de Marília", "Instituto de Olhos Marília"],
  Jaú: ["Hospital Amaral Carvalho - Jaú", "Centro de Especialidades Jaú"],
  Ourinhos: ["Santa Casa de Ourinhos", "Centro de Diagnóstico Ourinhos"],
};

const especialidades = [
  "Cardiologia",
  "Nefrologia",
  "Ortopedia",
  "Ginecologia",
  "Endocrinologia",
  "Neurologia",
  "Oftalmologia",
  "Oncologia",
  "Ressonância magnética",
  "Tomografia",
  "Ultrassonografia",
  "Hemodiálise",
  "Quimioterapia",
  "Fisioterapia neurológica",
];

const nomes = [
  "Maria Aparecida Souza",
  "João Batista Lima",
  "Antônia Ferreira Dias",
  "Carlos Eduardo Prado",
  "Rosilda Martins",
  "Sebastião Nunes Rocha",
  "Patrícia Gomes Alves",
  "Wesley Ramos Oliveira",
  "Cleide Barbosa Pinto",
  "Marcos Vinícius Teixeira",
  "Edna Ramos de Almeida",
  "Luiz Felipe Pereira",
  "Terezinha da Silva Borges",
  "José Ricardo Almeida",
  "Fernanda Lopes Cardoso",
  "Aparecido Donizete Souza",
  "Ivone Ribeiro Costa",
  "Miguel Ângelo Batista",
  "Sandra Regina Pires",
  "Paulo Henrique Matos",
  "Rosa Maria Nogueira",
  "Cláudio Roberto Faria",
  "Neide Aparecida Caetano",
  "Vera Lúcia Fontes",
  "Benedito Camargo Neto",
  "Luciana Freitas Andrade",
  "Arnaldo César Moreira",
  "Regina Célia Duarte",
  "Otávio Augusto Campos",
  "Helena Maria Rezende",
];

const postos = [
  "UBS Centro",
  "UBS Vila Hortência",
  "UBS Jardim Alvorada",
  "UBS Bairro São Roque",
  "UBS Jardim Paraíso",
];

const mobilidades = ["INDEPENDENTE", "APOIO", "CADEIRANTE"];

const pacientes = nomes.map((name, i) => {
  const n = i + 1;
  const phone = i === 29 ? "0000" : `(00) 00000-${String(n).padStart(4, "0")}`;
  return {
    name,
    cpf: String(10000000000 + i * 11111111).slice(0, 11),
    susCard: `700${String(100000000000 + i * 31415926).slice(0, 12)}`,
    phone,
    birth: `${1940 + ((i * 7) % 55)}-${String(((i * 3) % 12) + 1).padStart(2, "0")}-${String(((i * 5) % 27) + 1).padStart(2, "0")}`,
    city: CIDADE_ORIGEM,
    post: postos[i % postos.length],
    mobility: i % 9 === 0 ? "CADEIRANTE" : i % 3 === 0 ? "APOIO" : mobilidades[i % 2],
    address: `Rua Exemplo, ${100 + i}`,
  };
});

const urgencias = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];

async function seedPatients() {
  const created = [];
  for (const p of pacientes) {
    created.push(
      await db.patient.create({
        data: {
          name: p.name,
          cpf: p.cpf,
          susCard: p.susCard,
          phone: p.phone,
          birthDate: new Date(p.birth + "T12:00:00Z"),
          city: p.city,
          address: p.address,
          healthPost: p.post,
          mobility: p.mobility,
        },
      }),
    );
  }
  return created;
}

async function main() {
  console.log("Limpando base...");
  await db.notification.deleteMany();
  await db.seat.deleteMany();
  await db.referral.deleteMany();
  await db.trip.deleteMany();
  await db.patient.deleteMany();
  await db.setting.deleteMany();

  await seedSettings();
  const p = await seedPatients();

  const day = 86_400_000;
  const now = Date.now();

  console.log("Criando 6 viagens de ida + 6 de volta...");
  const cidades = ["Bauru", "Botucatu", "São Carlos", "Marília", "Jaú", "Ourinhos"];
  const veiculos = [
    { vehicle: "Van TFD-01 (WEG)", driver: "Antônio Carlos Ferreira", phone: "14999110022" },
    { vehicle: "Van TFD-02 (WEG)", driver: "Maria Cláudia Santos", phone: "14999330044" },
    { vehicle: "Ônibus TFD-03", driver: "Joel Ferreira", phone: "14999550066" },
    { vehicle: "Micro-ônibus TFD-04", driver: "Sérgio Luiz Prado", phone: "14999770088" },
    { vehicle: "Van TFD-05", driver: "Adriana Lopes", phone: "14999880099" },
    { vehicle: "Van TFD-06", driver: "Roberto Camargo", phone: "14999660033" },
  ];

  const pairs: Array<{
    dest: string;
    outbound: { id: string };
    returnTrip: { id: string };
    capacity: number;
  }> = [];

  for (let i = 0; i < cidades.length; i++) {
    const dest = cidades[i];
    const v = veiculos[i];
    const offsetDays = i < 2 ? i : i + 1;
    const departureAt = new Date(now + offsetDays * day + 6 * 3_600_000);
    const capacity = i % 2 === 0 ? 8 : 6;

    const outbound = await db.trip.create({
      data: {
        departureAt,
        originCity: CIDADE_ORIGEM,
        destinationCity: dest,
        vehicle: v.vehicle,
        driver: v.driver,
        phone: v.phone,
        capacity,
        status: "PLANEJADA",
        tripKind: "IDA",
        notes: `TFD semanal - ${dest}`,
      },
    });
    const returnTrip = await db.trip.create({
      data: {
        departureAt: returnDepartureAt(departureAt),
        originCity: dest,
        destinationCity: CIDADE_ORIGEM,
        vehicle: v.vehicle,
        driver: v.driver,
        phone: v.phone,
        capacity,
        status: "PLANEJADA",
        tripKind: "VOLTA",
        parentTripId: outbound.id,
        notes: `Retorno da viagem de ida (${CIDADE_ORIGEM} -> ${dest})`,
      },
    });
    pairs.push({ dest, outbound, returnTrip, capacity });
  }

  console.log("Criando encaminhamentos...");
  const created: Array<{
    id: string;
    status: string;
    dest: string;
    specialty: string | null;
  }> = [];

  const total = 30;
  const idaAlocados: Record<string, string[]> = {};
  for (const pair of pairs) idaAlocados[pair.outbound.id] = [];

  for (let i = 0; i < total; i++) {
    const pair = pairs[i % pairs.length];
    const unit = unidades[pair.dest][i % unidades[pair.dest].length];
    const specialty = especialidades[i % especialidades.length];
    const urgency = urgencias[i % urgencias.length];
    const kind = i % 3 === 0 ? "CONSULTA" : i % 3 === 1 ? "EXAME" : "TRATAMENTO";

    const r = await db.referral.create({
      data: {
        patientId: p[i].id,
        kind,
        specialty,
        destinationCity: pair.dest,
        destinationUnit: unit,
        requestedBy: `Dr(a). ${pacientes[i].post}`,
        requestedAt: new Date(now - (3 + (i % 20)) * day),
        preferredDate: new Date(now + (i % 7) * day),
        urgency,
        status: "AGUARDANDO_VAGA",
        queueSince: new Date(now - (i % 15) * day),
        notes: i % 7 === 0 ? "Paciente precisa de acompanhante." : null,
      },
    });
    created.push({ id: r.id, status: r.status, dest: r.destinationCity, specialty: r.specialty });
  }

  console.log("Alocando assentos (ida + volta)...");
  const usados = new Set<string>();
  for (const pair of pairs) {
    let numeroIda = 1;
    let numeroVolta = 1;
    for (const r of created) {
      if (usados.has(r.id)) continue;
      if (r.dest !== pair.dest) continue;
      if (idaAlocados[pair.outbound.id].length >= pair.capacity) continue;
      await db.seat.create({
        data: { tripId: pair.outbound.id, referralId: r.id, number: numeroIda++, status: "RESERVADA" },
      });
      await db.seat.create({
        data: { tripId: pair.returnTrip.id, referralId: r.id, number: numeroVolta++, status: "RESERVADA" },
      });
      await db.referral.update({ where: { id: r.id }, data: { status: "CONFIRMADO" } });
      r.status = "CONFIRMADO";
      idaAlocados[pair.outbound.id].push(r.id);
      usados.add(r.id);
      if (idaAlocados[pair.outbound.id].length >= Math.min(3, pair.capacity)) break;
    }
  }

  const confirmados = created.filter((r) => r.status === "CONFIRMADO");
  for (const r of confirmados) {
    await db.referral.update({ where: { id: r.id }, data: { status: "CONFIRMADO" } });
  }

  console.log("Encerrando viagens passadas (histórico)...");
  const [atendido] = await db.referral.findMany({
    where: { status: "CONFIRMADO" },
    take: 1,
  });
  if (atendido) {
    await db.referral.update({ where: { id: atendido.id }, data: { status: "ATENDIDO" } });
  }
  const faltouCandidato = await db.referral.findFirst({
    where: { status: "CONFIRMADO", id: { not: atendido?.id } },
  });
  if (faltouCandidato) {
    await db.referral.update({ where: { id: faltouCandidato.id }, data: { status: "FALTOU" } });
  }

  console.log("Gerando histórico de notificações...");
  const notifyHistory = async (
    referralId: string,
    kind: string,
    tripId: string | null,
    status: "ENVIADA" | "FALHA",
    sentOffsetMs: number,
    error?: string,
  ) => {
    const referral = await db.referral.findUnique({
      where: { id: referralId },
      include: { patient: true },
    });
    if (!referral) return;
    const trip = tripId ? await db.trip.findUnique({ where: { id: tripId } }) : null;
    const message = trip
      ? buildMessage(kind, tripMessageContext(referral, trip))
      : buildMessage(kind, {
          patientName: referral.patient.name,
          kindLabel: referral.specialty || referral.kind,
          destinationCity: referral.destinationCity,
          destinationUnit: referral.destinationUnit,
        });
    const notification = await queueNotification({
      referralId,
      kind,
      to: referral.patient.phone,
      patientName: referral.patient.name,
      message,
    });
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status,
        sentAt: status === "ENVIADA" ? new Date(now - sentOffsetMs) : null,
        createdAt: new Date(now - sentOffsetMs),
        error: error || null,
      },
    });
  };

  for (const pair of pairs) {
    for (const referralId of idaAlocados[pair.outbound.id]) {
      await notifyHistory(referralId, "CONFIRMACAO", pair.outbound.id, "ENVIADA", 2 * day);
      await notifyHistory(referralId, "RETORNO_AGENDADO", pair.returnTrip.id, "ENVIADA", 2 * day);
    }
  }
  if (atendido) await notifyHistory(atendido.id, "RETORNO", null, "ENVIADA", 1 * day);
  const semTelefone = created[total - 1];
  await notifyHistory(semTelefone.id, "CONFIRMACAO", null, "FALHA", 1 * day, "Numero de telefone invalido (DDD + numero)");

  const summary = {
    patients: await db.patient.count(),
    referrals: await db.referral.count(),
    trips: await db.trip.count(),
    idas: await db.trip.count({ where: { tripKind: "IDA" } }),
    voltas: await db.trip.count({ where: { tripKind: "VOLTA" } }),
    seats: await db.seat.count(),
    notifications: await db.notification.count(),
  };
  console.log("Seed concluido:", summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
