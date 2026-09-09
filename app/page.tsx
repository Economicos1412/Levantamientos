import Workspace from '@/components/workspace';

export default function Home() {
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-logo"><img src="/cfe-logo.png" alt="CFE · Comisión Federal de Electricidad"/></span><h1>Levantamientos</h1></div>
    </header>
    <Workspace/>
  </div>;
}
