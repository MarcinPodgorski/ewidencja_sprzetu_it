import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { apiUrl } from '../../lib/api';
import { useDeleteFaktura, useFaktura } from './faktury.hooks';

function formatMoney(grosze: number): string {
  return `${(grosze / 100).toFixed(2)} zł`;
}

export function FakturaDetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: faktura, isLoading, isError } = useFaktura(numId);
  const deleteMutation = useDeleteFaktura();

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (isError || !faktura) {
    return (
      <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
        Nie znaleziono tej faktury. Mogła zostać usunięta albo link jest nieprawidłowy.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={faktura.numer}
        subtitle="Faktura"
        backTo="/faktury"
        actions={
          <>
            <Link to={`/faktury/${faktura.id}/edit`} className="btn-secondary">
              Edytuj
            </Link>
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              Usuń
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Dane faktury</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Numer</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{faktura.numer}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Numer KSeF</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{faktura.numerKsef ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Kwota</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(faktura.kwotaGrosze)}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Załączniki</h2>
          <div className="space-y-2">
            {faktura.plikPdf ? (
              <a href={apiUrl(`/faktury/${faktura.id}/plik/pdf`)} download className="btn-secondary block text-center">
                Pobierz PDF
              </a>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Brak załącznika PDF.</p>
            )}
            {faktura.plikXml ? (
              <a href={apiUrl(`/faktury/${faktura.id}/plik/xml`)} download className="btn-secondary block text-center">
                Pobierz XML
              </a>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Brak załącznika XML.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Sprzęt objęty fakturą</h2>
        {faktura.pozycje.length === 0 ? (
          <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Brak powiązanego sprzętu.</div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Identyfikator</th>
                  <th>Marka/model</th>
                </tr>
              </thead>
              <tbody>
                {faktura.pozycje.map((p) => {
                  const typ = p.sprzetTyp as EquipmentType;
                  const segment = EQUIPMENT_API_SEGMENT[typ];
                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/${segment}/${p.sprzetId}`)}>
                      <td>{EQUIPMENT_TYPE_LABELS[typ]}</td>
                      <td>{p.sprzet?.identyfikator ?? p.sprzetId}</td>
                      <td>{p.sprzet?.opis ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć tę fakturę?"
        description="Faktura zostanie trwale usunięta razem z powiązaniami do sprzętu i załącznikami. Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(faktura.id, { onSuccess: () => navigate('/faktury') })}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
