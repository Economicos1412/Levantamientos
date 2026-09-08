import { MapPin } from 'lucide-react';
import Workspace from '@/components/workspace';

export default function Home() {
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-logo"><img src="/cfe-logo.png" alt="CFE · Comisión Federal de Electricidad"/></span><div><p className="brand-overline">CONTROL DE VEGETACIÓN</p><h1>Levantamientos</h1></div></div>
      <div className="header-label"><span className="header-signal"/><MapPin size={16}/><span><strong>Operación en campo</strong><small>Control por ramal</small></span></div>
    </header>
    <Workspace/>
  </div>;
}
