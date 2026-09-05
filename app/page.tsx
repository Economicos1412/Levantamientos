import { Network, MapPin } from 'lucide-react';
import Workspace from '@/components/workspace';

export default function Home() {
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-mark"><Network size={25}/></span><div><h1>Levantamientos</h1><p>Registro de campo</p></div></div>
      <span className="header-label"><MapPin size={16}/> Control por ramal</span>
    </header>
    <Workspace/>
  </div>;
}
