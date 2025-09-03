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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
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
              <FolderTree workspaceId={selectedWorkspace} />
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
