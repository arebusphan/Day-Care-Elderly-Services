import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import Layout from './layouts/layout'
import Home from './components/Home'

function App() {
 

    return (
        <div>
            <Layout>
                <Home />
            </Layout>
        </div>
  )
}

export default App
