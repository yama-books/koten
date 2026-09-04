import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import './styles.css';

render(<ErrorBoundary><Home /></ErrorBoundary>, document.getElementById('app')!);
