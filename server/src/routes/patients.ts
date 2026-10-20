import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { MOBILITIES } from "../domain";

export async function patientRoutes(app: FastifyInstance) {
  app.get("/api/patients", async (req) => {
    const { search } = req.query as { search?: string };
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { cpf: { contains: search } },
            { susCard: { contains: search } },
            { city: { contains: search } },
            { healthPost: { contains: search } },
          ],
        }
      : {};
    return db.patient.findMany({
      where,
      include: {
        _count: { select: { referrals: true } },
        referrals: {
          select: { id: true, status: true, kind: true, specialty: true, destinationCity: true },
          orderBy: { requestedAt: "desc" },
          take: 3,
        },
      },
      orderBy: { name: "asc" },
      take: 200,
    });
  });

  app.get("/api/patients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        referrals: {
          orderBy: { requestedAt: "desc" },
          include: {
            seat: { include: { trip: true } },
            notifications: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
      },
    });
    if (!patient) return reply.code(404).send({ error: "Paciente nao encontrado" });
    return patient;
  });

  app.post("/api/patients", async (req, reply) => {
    const body = req.body as Record<string, any>;
    if (!body.name?.trim()) return reply.code(400).send({ error: "Nome e obrigatorio" });
    if (!body.phone?.trim()) return reply.code(400).send({ error: "Telefone e obrigatorio" });
    if (!body.city?.trim()) return reply.code(400).send({ error: "Cidade e obrigatoria" });
    if (!body.healthPost?.trim())
      return reply.code(400).send({ error: "Posto de saude e obrigatorio" });
    if (body.mobility && !MOBILITIES.includes(body.mobility))
      return reply.code(400).send({ error: "Mobilidade invalida" });
    try {
      const patient = await db.patient.create({
        data: {
          name: body.name.trim(),
          cpf: body.cpf?.trim() || null,
          susCard: body.susCard?.trim() || null,
          phone: body.phone.trim(),
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
          city: body.city.trim(),
          address: body.address?.trim() || null,
          healthPost: body.healthPost.trim(),
          mobility: body.mobility || "INDEPENDENTE",
          notes: body.notes?.trim() || null,
        },
      });
      return reply.code(201).send(patient);
    } catch (error: any) {
      if (error?.code === "P2002")
        return reply.code(409).send({ error: "CPF ja cadastrado para outro paciente" });
      throw error;
    }
  });

  app.put("/api/patients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;
    const existing = await db.patient.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Paciente nao encontrado" });
    try {
      return await db.patient.update({
        where: { id },
        data: {
          name: body.name?.trim() || existing.name,
          cpf: body.cpf !== undefined ? body.cpf?.trim() || null : existing.cpf,
          susCard: body.susCard !== undefined ? body.susCard?.trim() || null : existing.susCard,
          phone: body.phone?.trim() || existing.phone,
          birthDate:
            body.birthDate !== undefined
              ? body.birthDate
                ? new Date(body.birthDate)
                : null
              : existing.birthDate,
          city: body.city?.trim() || existing.city,
          address: body.address !== undefined ? body.address?.trim() || null : existing.address,
          healthPost: body.healthPost?.trim() || existing.healthPost,
          mobility: body.mobility || existing.mobility,
          notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002")
        return reply.code(409).send({ error: "CPF ja cadastrado para outro paciente" });
      throw error;
    }
  });
}
