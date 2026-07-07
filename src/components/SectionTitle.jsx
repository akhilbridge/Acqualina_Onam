export default function SectionTitle({ title, description, action }) {
  return (
    <div className="section-title">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
