import { Router } from 'express';
import { idParamSchema, profilOprogramowaniaCreateSchema, profilOprogramowaniaUpdateSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

/** Profile oprogramowania — gotowe zestawy programów do skryptu onboardingu. */
export const profileOprogramowaniaRouter = Router();

profileOprogramowaniaRouter.use(requireAuth, requireRole('ADMIN'));

const include = {
  dzial: true,
  pozycje: { include: { oprogramowanie: true }, orderBy: { oprogramowanie: { nazwa: 'asc' } } },
} as const;

type ProfilZPozycjami = NonNullable<Awaited<ReturnType<typeof znajdzProfil>>>;

function znajdzProfil(id: number) {
  return prisma.profilOprogramowania.findUnique({ where: { id }, include });
}

/** Spłaszcza pozycje do listy programów — wygodniejszy kształt dla klienta. */
function serialize(profil: ProfilZPozycjami) {
  const { pozycje, ...rest } = profil;
  return { ...rest, oprogramowanie: pozycje.map((p) => p.oprogramowanie) };
}

profileOprogramowaniaRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.profilOprogramowania.findMany({ include, orderBy: { nazwa: 'asc' } });
    res.json({ items: items.map(serialize) });
  }),
);

profileOprogramowaniaRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const profil = await znajdzProfil(id);
    if (!profil) throw new AppError(404, 'Nie znaleziono profilu');
    res.json({ item: serialize(profil) });
  }),
);

profileOprogramowaniaRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { oprogramowanieIds, ...data } = profilOprogramowaniaCreateSchema.parse(req.body);
    const profil = await prisma.profilOprogramowania.create({
      data: {
        ...data,
        pozycje: { create: [...new Set(oprogramowanieIds)].map((oprogramowanieId) => ({ oprogramowanieId })) },
      },
      include,
    });
    res.status(201).json({ item: serialize(profil) });
  }),
);

profileOprogramowaniaRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { oprogramowanieIds, ...data } = profilOprogramowaniaUpdateSchema.parse(req.body);
    const profil = await prisma.$transaction(async (tx) => {
      if (oprogramowanieIds) {
        // Pełne zastąpienie listy — jak przy pozycjach faktury.
        await tx.profilOprogramowaniaPozycja.deleteMany({ where: { profilId: id } });
      }
      return tx.profilOprogramowania.update({
        where: { id },
        data: {
          ...data,
          ...(oprogramowanieIds
            ? { pozycje: { create: [...new Set(oprogramowanieIds)].map((oprogramowanieId) => ({ oprogramowanieId })) } }
            : {}),
        },
        include,
      });
    });
    res.json({ item: serialize(profil) });
  }),
);

profileOprogramowaniaRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.profilOprogramowania.delete({ where: { id } });
    res.status(204).end();
  }),
);
