import React, { useEffect, useState } from 'react'

import { ElectronAPI } from '@electron-toolkit/preload'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

interface Task {
  id: string
  title: string
}

const FocusApp: React.FC = () => {
  const [task, setTask] = useState<Task>({ id: '', title: 'Focus Mode' })
  const [countdownSeconds, setCountdownSeconds] = useState(25 * 60)

  useEffect(() => {
    // Listen for task data from main process
    const handleTaskData = (_: unknown, taskData: Task): void => {
      console.log('Received task data:', taskData)
      setTask(taskData)
    }

    // Check if electron is available
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.on('task-data', handleTaskData)
    }

    return (): void => {
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.ipcRenderer.removeAllListeners('task-data')
      }
    }
  }, [])

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Timer finished
          if (typeof window !== 'undefined' && window.electron) {
            window.electron.ipcRenderer.send('focus-complete')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return (): void => clearInterval(interval)
  }, [])

  const handleExit = (): void => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.send('exit-focus-mode')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="focus-bar">
      <div className="drag-region">
        <h3 className="task-title">{task.title}</h3>
        <div className="countdown">{formatTime(countdownSeconds)}</div>
      </div>
      <button type="button" className="exit-btn" onClick={handleExit}>
        Exit
      </button>
    </div>
  )
}

// Initialize the React app
const container = document.getElementById('root')
if (container) {
  console.log('Initializing React app in focus mode')
  const root = createRoot(container)
  root.render(<FocusApp />)
} else {
  console.error('Could not find root container')
}

export default FocusApp
