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
  Moon,
  Sun,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { signOut } = useAuthActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [expandedFolder, setExpandedFolder] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true" || document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const workspaces = useQuery(api.workspaces.getWorkspaces);

  const searchDocuments = useQuery(
    api.documents.searchDocuments,
    selectedWorkspace && searchQuery.trim()
      ? { workspaceId: selectedWorkspace, searchQuery: searchQuery.trim() }
      : "skip"
  );
  
  const searchFolders = useQuery(
    api.folders.searchFolders,
    selectedWorkspace && searchQuery.trim()
      ? { workspaceId: selectedWorkspace, searchQuery: searchQuery.trim() }
      : "skip"
  );

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

  const handleToggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    localStorage.setItem("darkMode", newMode.toString());
    toast.success(`${newMode ? "Dark" : "Light"} mode enabled`);
  };

  const handleFolderClick = (folder) => {
    // Clear search to show folder contents
    setSearchQuery("");
    setExpandedFolder(folder._id);
    toast.success(`Navigated to ${folder.name} folder`);
  };

  useEffect(() => {
    // Initialize dark mode on component mount
    const savedMode = localStorage.getItem("darkMode") === "true";
    if (savedMode) {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);


  if (!isOpen) {
    return (
      <div
        className="hidden lg:block w-2 bg-muted hover:bg-muted-foreground/10 transition-colors cursor-pointer"
        onClick={onToggle}
      />
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onToggle}
      />

      <div className="lg:relative absolute z-50 w-80 h-full bg-background border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                Potion
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleDarkMode}
                className="h-6 w-6"
                title={`Switch to ${darkMode ? "light" : "dark"} mode`}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
              searchQuery.trim() ? 'text-blue-500 dark:text-blue-400' : 'text-muted-foreground'
            }`} />
            <Input
              type="text"
              placeholder="Search folders and notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-8 bg-muted/50 transition-all duration-200 ${
                searchQuery.trim() 
                  ? 'ring-2 ring-blue-200 dark:ring-blue-800 border-blue-300 dark:border-blue-600' 
                  : ''
              }`}
            />
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1 mb-4">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="w-full justify-start"
            >
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>

            <Button
              variant={location.pathname === "/settings" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="w-full justify-start"
            >
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>

            <Button
              variant={location.pathname === "/trash" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="w-full justify-start"
            >
              <Link to="/trash">
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </Link>
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Workspace Selector */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Workspaces
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateWorkspace}
                className="h-6 w-6"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-1">
              {workspaces?.map((workspace) => (
                <Button
                  key={workspace._id}
                  variant={selectedWorkspace === workspace._id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedWorkspace(workspace._id)}
                  className="w-full justify-start"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span className="truncate">{workspace.name}</span>
                  {workspaces?.length > 1 && selectedWorkspace === workspace._id && (
                    <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                      Active
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Documents and Folders */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pages
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateDocument}
                className="h-6 w-6"
                disabled={!selectedWorkspace}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {selectedWorkspace && (
              searchQuery.trim() ? (
                // Search Results
                <div className="space-y-1">
                  {/* Show loading state */}
                  {searchDocuments === undefined && searchFolders === undefined ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {/* Folders results */}
                      {searchFolders?.map((folder) => (
                        <div
                          key={`folder-${folder._id}`}
                          onClick={() => handleFolderClick(folder)}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-l-2 hover:border-blue-400 cursor-pointer transition-all duration-200 group"
                        >
                          <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate flex-1 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            {folder.name}
                          </span>
                          <div className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md font-medium">
                            Folder
                          </div>
                        </div>
                      ))}
                      
                      {/* Documents results */}
                      {searchDocuments?.map((doc) => (
                        <Link
                          key={`doc-${doc._id}`}
                          to={`/document/${doc._id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg cursor-pointer transition-all duration-200 group ${
                            location.pathname === `/document/${doc._id}`
                              ? "bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/40 dark:to-blue-950/20 border-l-3 border-blue-500 shadow-sm"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-l-2 hover:border-green-400"
                          }`}
                        >
                          <span className={`text-lg flex-shrink-0 transition-transform group-hover:scale-110 ${
                            location.pathname === `/document/${doc._id}` ? 'scale-110' : 'scale-100'
                          }`}>
                            {doc.emoji || "📄"}
                          </span>
                          <span className={`truncate flex-1 font-medium transition-colors ${
                            location.pathname === `/document/${doc._id}`
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-300"
                          }`}>
                            {doc.title}
                          </span>
                          <div className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md font-medium">
                            Note
                          </div>
                        </Link>
                      ))}
                      
                      {/* No results */}
                      {searchFolders?.length === 0 && searchDocuments?.length === 0 && (
                        <div className="px-2 py-8 text-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 font-medium">
                            No results found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Try searching with different keywords
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Normal folder tree view
                <FolderTree 
                  workspaceId={selectedWorkspace} 
                  initialExpandedFolder={expandedFolder}
                />
              )
            )}

            {!selectedWorkspace && (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No workspace selected
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateWorkspace}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Create Workspace
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
