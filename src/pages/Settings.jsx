import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { FiUser, FiMoon, FiSun, FiGithub, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function Settings() {
  const { signOut } = useAuthActions()
  const [darkMode, setDarkMode] = useState(false)

  const handleToggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    localStorage.setItem('darkMode', newMode.toString())
    toast.success(`${newMode ? 'Dark' : 'Light'} mode enabled`)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="h-full bg-notion overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Profile Section */}
          <div className="bg-white rounded-lg border border-notion p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser className="w-5 h-5" />
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-white rounded-lg border border-notion p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Appearance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Theme</h3>
                  <p className="text-sm text-gray-600">
                    Choose between light and dark mode
                  </p>
                </div>
                <button
                  onClick={handleToggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FiSun className="w-4 h-4" />
                    <span className="font-medium">Light</span>
                  </div>
                  <div className="bg-white border rounded p-2">
                    <div className="h-2 bg-gray-100 rounded mb-1"></div>
                    <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                  </div>
                </div>
                
                <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FiMoon className="w-4 h-4" />
                    <span className="font-medium">Dark</span>
                  </div>
                  <div className="bg-gray-800 border border-gray-600 rounded p-2">
                    <div className="h-2 bg-gray-600 rounded mb-1"></div>
                    <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div className="bg-white rounded-lg border border-notion p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FiGithub className="w-6 h-6" />
                  <div>
                    <h3 className="font-medium text-gray-900">GitHub</h3>
                    <p className="text-sm text-gray-600">
                      Sync your documents to GitHub repositories
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center gap-2">
              <FiTrash2 className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Sign Out</h3>
                  <p className="text-sm text-gray-600">
                    Sign out of your account
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Delete Account</h3>
                  <p className="text-sm text-gray-600">
                    Permanently delete your account and all data
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}