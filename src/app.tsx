import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/home';
import Compress from './pages/compress';
import Crop from './pages/crop';
import Resize from './pages/resize';
import Studio from './pages/studio';
import Unavailable from './pages/unavailable';
import { Shell } from './shell';
import { tools, type Tool } from './tools/registry';

function toolPage(tool: Tool) {
  if (tool.id === 'remove-background') return <Studio />;
  if (tool.id === 'compress') return <Compress />;
  if (tool.id === 'resize') return <Resize />;
  if (tool.id === 'crop') return <Crop />;
  return <Unavailable tool={tool} />;
}

export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          {tools.map((tool) => (
            <Route key={tool.id} path={tool.path} element={toolPage(tool)} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
