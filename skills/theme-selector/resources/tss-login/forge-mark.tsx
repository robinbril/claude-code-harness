import * as React from "react";

// De Reforge forge-mark (geometrisch merkteken uit de Reforge Brand Kit).
// currentColor laat de kleur de context volgen: diep violet op een licht vlak,
// wit op een donker vlak. In de login staat hij op wit (#fff) op het navy glas.
// ViewBox is hoger dan breed (436 x 485); nooit vervormen.
export function ForgeMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 436.3263 485.2138"
      fill="none"
      role="img"
      aria-label="The Staffing Society"
      className={className}
    >
      <path
        fill="currentColor"
        d="M428.2828,121.3092c-5.2741-9.134-12.8759-16.7358-21.9502-21.9509L248.172,8.0212c-18.5327-10.6949-41.5141-10.6949-59.9878,0L29.9941,99.3295C11.4912,109.9949,0,129.9123,0,151.3029v182.6152c0,21.3906,11.4912,41.308,29.9941,51.9734l158.1901,91.3083c9.0452,5.2439,19.4164,8.014,29.9937,8.014,10.5482,0,20.9194-2.7701,29.9941-8.014l158.1606-91.3083c18.5028-10.6654,29.9937-30.5828,29.9937-51.9734v-182.6152c0-10.5187-2.7989-20.8899-8.0435-29.9937ZM348.9667,376.9942v-166.5282l-54.3605-36.3583v234.2649l-49.263,28.4616v-191.9844l-54.3307-36.3583v228.3427l-49.2925-28.4616v-122.9219l-54.3307-36.3878v127.9608l-39.2162-22.6573c-7.2774-4.1843-11.7854-12.0214-11.7854-20.4483v-182.6152c0-8.4269,4.508-16.2639,11.7854-20.4475L206.363,39.5183c7.1598-4.1253,16.4114-4.1253,23.6003,0l158.1897,91.3371c7.2778,4.1836,11.7854,12.0206,11.7854,20.4475v182.6152c0,8.4269-4.5077,16.2639-11.7854,20.4483l-39.1863,22.6278Z"
      />
    </svg>
  );
}
