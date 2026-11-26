import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="center-page">
      <h1>404</h1>
      <p>Esta página no existe o fue movida.</p>
      <Link className="btn primary" to="/">Volver al panel</Link>
    </div>
  );
}
