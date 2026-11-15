// app/p/[id]/page.tsx — portalul public de prezentare și aprobare pentru clientul final.
// Componentă de SERVER: citește proiectul direct prin stratul de date (getPublicProject), cu
// aceeași proiecție strictă ca /api/public/projects/[id]. În browser ajunge doar `PublicProject`
// — marjele, contingența, tarifele orare și notele interne nu sunt nici măcar citite din DB.
//
// Cache Components (next.config: cacheComponents): `params` și interogarea sunt date de la
// momentul cererii, deci stau sub <Suspense>; scheletul static pleacă imediat, conținutul vine în flux.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getPublicProject } from '@/app/lib/server/db';
import { PROJECT_ID_PATTERN } from '@/app/lib/server/estimates';
import PortalView from '@/app/components/portal/PortalView';
import PortalNotFound from '@/app/components/portal/PortalNotFound';

// Linkurile sunt private prin obscuritate (id lung): nu le lăsăm indexate de motoarele de căutare.
export const metadata: Metadata = {
  title: 'SUCVAR | Prezentare proiect',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer', // id-ul din URL nu pleacă spre alte site-uri prin antetul Referer
};

async function PortalLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PROJECT_ID_PATTERN.test(id)) return <PortalNotFound />;
  let project = null;
  try {
    project = await getPublicProject(id);
  } catch (error) {
    console.error('[SUCVAR] /p/[id]:', error);
  }
  return project ? <PortalView project={project} /> : <PortalNotFound />;
}

function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0C]" aria-busy="true">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-10 pt-24 space-y-6">
        <div className="h-8 w-64 rounded-sm bg-[#F5F5F5] dark:bg-[#141416] animate-pulse" />
        <div className="h-[320px] sm:h-[520px] rounded-md bg-[#F5F5F5] dark:bg-[#141416] animate-pulse" />
      </div>
    </div>
  );
}

export default function PublicProjectPage({ params }: PageProps<'/p/[id]'>) {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <PortalLoader params={params} />
    </Suspense>
  );
}
