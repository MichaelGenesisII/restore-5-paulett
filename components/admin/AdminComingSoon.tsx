export default function AdminComingSoonPage({
  title,
  batch,
}: {
  title: string;
  batch: string;
}) {
  return (
    <div>
      <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
        Coming soon
      </p>
      <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/65">
        This section ships in {batch}. Auth and navigation are live — check the
        plan for the full batch list.
      </p>
    </div>
  );
}
