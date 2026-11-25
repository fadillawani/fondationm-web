/** « Ce que vos élèves verront » (maquette W5-E2) : 4 puces sur PC, paragraphe court sur mobile. */
export function WhatStudentsSee() {
  return (
    <section aria-labelledby="ce-que-verront" className="flex flex-col gap-1.5 rounded-[18px] bg-surface p-3.5 lg:gap-2.5 lg:rounded-[24px] lg:p-5">
      <h2 id="ce-que-verront" className="font-sans text-[15px] font-black text-ink lg:font-display lg:text-xl lg:font-normal lg:uppercase">
        Ce que vos élèves verront
      </h2>
      <p className="text-[13px] leading-[1.45] font-bold text-muted lg:hidden">
        Les rencontres confirmées et réalisées de leur classe, l'intervenant et ses compétences. En lecture seule, sans
        contact direct avec l'intervenant.
      </p>
      <ul className="hidden list-disc flex-col gap-2 pl-[18px] text-sm leading-[1.45] font-bold text-ink lg:flex">
        <li>
          Les rencontres <strong className="font-black">confirmées</strong> et <strong className="font-black">réalisées</strong> de
          leur classe.
        </li>
        <li>Le nom de l'intervenant, son métier et ses compétences.</li>
        <li>Un espace en lecture seule : ils ne peuvent rien écrire.</li>
        <li>Aucun contact direct avec l'intervenant : tout passe par vous et la Fondation M.</li>
      </ul>
    </section>
  )
}
