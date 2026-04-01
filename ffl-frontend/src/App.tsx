import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Seasons from './pages/Seasons'
import Teams from './pages/Teams'
import Players from './pages/Players'
import Managers from './pages/Managers'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="seasons" element={<Seasons />} />
          <Route path="teams" element={<Teams />} />
          <Route path="players" element={<Players />} />
          <Route path="managers" element={<Managers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App