import App from './App'
import IntroPage from './pages/IntroPage'
import { useRoute } from './router'

export default function Root() {
  const route = useRoute()
  return route === 'app' ? <App /> : <IntroPage />
}
