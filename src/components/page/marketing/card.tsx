import type { ImageMetadata } from "astro";

const Card = ({
  title,
  description,
  step,
  image,
}: {
  title: string;
  description: string;
  step: number;
  image: ImageMetadata;
}) => {
  return (
    <article className="@container bg-white">
      <div className="min-h-[440px] p-5 sm:p-8 sm:pt-12 pb-0 sm:pb-0 @xl:min-h-auto @xl:flex @xl:justify-between @xl:align-top @xl:gap-16">
        <div className="max-w-xs mx-auto text-center mb-12 @xl:mb-0">
          <div className="mx-auto font-mono text-lg h-8 w-8 grid place-items-center bg-gray-200 mb-6 sm:h-12 sm:w-12">
            {step}
          </div>
          <h3 className="text-2xl font-semibold mb-1">{title}</h3>
          <p className="opacity-body leading-relaxed text-balance">{description}</p>
        </div>

        <img className="mx-auto @xl:self-end @xl:max-w-[300px]" src={image.src} alt={title} />
      </div>
    </article>
  );
};

export { Card };
