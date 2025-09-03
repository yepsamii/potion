import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import FolderTree from "./FolderTree";
import {
  Search,
  Settings,
  Trash2,
  Plus,
  Folder,
  X,
  LogOut,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { signOut } = useAuthActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const workspaces = useQuery(api.workspaces.getWorkspaces);

  const createDocument = useMutation(api.documents.createDocument);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]._id);
    }
  }, [workspaces, selectedWorkspace]);

  const handleCreateDocument = async () => {
    if (!selectedWorkspace) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      await createDocument({
        title: "Untitled",
        workspaceId: selectedWorkspace,
        emoji: "📄",
      });
      toast.success("Document created!");
    } catch (error) {
      toast.error("Failed to create document");
    }
  };

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter workspace name:");
    if (!name) return;

    try {
      const id = await createWorkspace({ name });
      setSelectedWorkspace(id);
      toast.success("Workspace created!");
    } catch (error) {
      toast.error("Failed to create workspace");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };


  if (!isOpen) {
    return (
      <div
        className="hidden lg:block w-2 bg-notion-gray-100 hover:bg-notion-gray-200 transition-colors cursor-pointer"
        onClick={onToggle}
      />
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onToggle}
      />

      <div className="lg:relative absolute z-50 w-80 h-full bg-white border-r border-notion flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-notion">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                Notion Clone
              </h1>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 rounded hover:bg-notion-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-notion-gray-50 rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1 mb-4">
            <Link
              to="/"
              className={`sidebar-item ${location.pathname === "/" ? "active" : ""}`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              to="/settings"
              className={`sidebar-item ${location.pathname === "/settings" ? "active" : ""}`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            <Link
              to="/trash"
              className={`sidebar-item ${location.pathname === "/trash" ? "active" : ""}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash</span>
            </Link>
          </div>

          {/* Workspace Selector */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Workspaces
              </span>
              <button
                onClick={handleCreateWorkspace}
                className="p-1 rounded hover:bg-notion-gray-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {workspaces?.map((workspace) => (
              <button
                key={workspace._id}
                onClick={() => setSelectedWorkspace(workspace._id)}
                className={`w-full text-left sidebar-item ${
                  selectedWorkspace === workspace._id ? "active" : ""
                }`}
              >
                <Folder className="w-4 h-4" />
                <span className="truncate">{workspace.name}</span>
              </button>
            ))}
          </div>

          {/* Documents and Folders */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pages
              </span>
              <button
                onClick={handleCreateDocument}
                className="p-1 rounded hover:bg-notion-gray-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {selectedWorkspace && (
              <FolderTree workspaceId={selectedWorkspace} />
            )}

            {!selectedWorkspace && (
              <div className="px-2 py-2 text-sm text-gray-500">
                Select a workspace to view documents
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-notion">
          <button
            onClick={handleSignOut}
            className="w-full sidebar-item text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
