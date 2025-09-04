import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Folder,
  FolderOpen,
  Trash2,
  Edit3,
  Plus,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FolderTree({
  workspaceId,
  level = 0,
  parentId = null,
  initialExpandedFolder = null,
}) {
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showActions, setShowActions] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [creatingFolderParentId, setCreatingFolderParentId] = useState(null);
  const [isRenamingFolder, setIsRenamingFolder] = useState(null); // stores folder ID being renamed
  const [folderName, setFolderName] = useState("");
  const [tempFolderName, setTempFolderName] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const folders = useQuery(
    parentId ? api.folders.getChildFolders : api.folders.getRootFolders,
    workspaceId ? (parentId ? { parentId } : { workspaceId }) : "skip"
  );

  const documents = useQuery(
    parentId
      ? api.documents.getDocumentsByFolder
      : api.documents.getRootDocuments,
    parentId
      ? { folderId: parentId }
      : workspaceId && level === 0
        ? { workspaceId }
        : "skip"
  );

  const createFolder = useMutation(api.folders.createFolder);
  const updateFolder = useMutation(api.folders.updateFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const createDocument = useMutation(api.documents.createDocument);
  const moveDocument = useMutation(api.documents.moveDocument);

  // Handle initial expanded folder from search navigation
  useEffect(() => {
    if (initialExpandedFolder && level === 0) {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.add(initialExpandedFolder);
        return newSet;
      });
    }
  }, [initialExpandedFolder, level]);

  const toggleExpanded = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async (name, parentId = null) => {
    if (!name?.trim()) return;

    try {
      const args = {
        name: name.trim(),
        workspaceId,
        emoji: "📁",
      };

      // Only add parentId if it's not null
      if (parentId) {
        args.parentId = parentId;
      }

      await createFolder(args);
      toast.success("Folder created!");
      setIsCreatingFolder(false);
      setCreatingFolderParentId(null);
      setTempFolderName("");
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const startInlineCreate = (parentId = null) => {
    setCreatingFolderParentId(parentId);
    setTempFolderName("");
    setIsCreatingFolder(true);
  };

  const cancelInlineCreate = () => {
    setIsCreatingFolder(false);
    setCreatingFolderParentId(null);
    setTempFolderName("");
  };

  const handleRenameFolder = async (folderId, newName) => {
    if (!newName?.trim()) return;

    try {
      await updateFolder({ id: folderId, name: newName.trim() });
      toast.success("Folder renamed!");
      setIsRenamingFolder(null);
      setFolderName("");
    } catch (error) {
      toast.error("Failed to rename folder");
    }
  };

  const startInlineRename = (folder) => {
    setIsRenamingFolder(folder._id);
    setFolderName(folder.name);
  };

  const cancelInlineRename = () => {
    setIsRenamingFolder(null);
    setFolderName("");
  };

  const handleDeleteFolder = async () => {
    try {
      await deleteFolder({ id: selectedFolderId });
      toast.success("Folder moved to trash!");
      setDeleteDialogOpen(false);
      setSelectedFolderId(null);
    } catch (error) {
      toast.error("Failed to delete folder");
    }
  };

  const openDeleteDialog = (folderId) => {
    setSelectedFolderId(folderId);
    setDeleteDialogOpen(true);
  };

  const handleDragStart = (e, item, type) => {
    e.stopPropagation();
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.type === "document") {
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    // Only clear if we're leaving the folder entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.type !== "document") return;

    // Don't move to same folder
    if (draggedItem.folderId === folderId) {
      setDragOverFolder(null);
      return;
    }

    try {
      await moveDocument({
        documentId: draggedItem._id,
        folderId: folderId,
      });
      toast.success(`Moved "${draggedItem.title}" to folder`);
    } catch (error) {
      toast.error("Failed to move document");
    }

    setDragOverFolder(null);
    setDraggedItem(null);
  };

  const handleCreateDocument = async (folderId = null) => {
    try {
      await createDocument({
        title: "Untitled",
        workspaceId,
        folderId: folderId,
        emoji: "📄",
      });
      toast.success("Document created!");
    } catch (error) {
      toast.error("Failed to create document");
    }
  };

  const renderFolder = (folder, isLast = false) => {
    const isExpanded = expandedFolders.has(folder._id);
    const hasChildren = true; // We assume it might have children
    const baseIndent = 6;
    const indentStep = 16;
    const paddingLeft = `${baseIndent + level * indentStep}px`;
    const isDragOver = dragOverFolder === folder._id;
    const isActive = showActions === folder._id;
    const isRenaming = isRenamingFolder === folder._id;
    
    // Modern color scheme
    const lineColor = isActive 
      ? 'border-blue-400 dark:border-blue-500' 
      : 'border-gray-200 dark:border-gray-700';
    const lineOpacity = isActive ? 'opacity-100' : 'opacity-60';

    return (
      <div
        key={folder._id}
        className="select-none relative mb-1"
        onDragOver={(e) => handleDragOver(e, folder._id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder._id)}
      >
        {/* Modern tree connecting lines */}
        {level > 0 && (
          <>
            {/* Main vertical line from parent - only to this item */}
            <div
              className={`absolute transition-all duration-300 ${lineColor} ${lineOpacity}`}
              style={{
                left: `${baseIndent + (level - 1) * indentStep + 12}px`,
                top: "0px",
                height: "50%",
                width: "2px",
                borderRadius: "1px",
              }}
            />
            {/* Continuation line to next sibling (if not last) */}
            {!isLast && (
              <div
                className={`absolute transition-all duration-300 border-gray-200 dark:border-gray-700 opacity-40`}
                style={{
                  left: `${baseIndent + (level - 1) * indentStep + 12}px`,
                  top: "50%",
                  bottom: "0px",
                  width: "2px",
                  borderRadius: "1px",
                }}
              />
            )}
            {/* Horizontal connector with modern styling */}
            <div
              className={`absolute transition-all duration-300 ${lineColor} ${lineOpacity}`}
              style={{
                left: `${baseIndent + (level - 1) * indentStep + 12}px`,
                top: "50%",
                width: `${indentStep - 12}px`,
                height: "2px",
                borderRadius: "1px",
                transform: "translateY(-50%)",
              }}
            />
            {/* Vertical line for this folder's children */}
            {isExpanded && hasChildren && (
              <div
                className={`absolute transition-all duration-300 border-gray-200 dark:border-gray-700 opacity-40`}
                style={{
                  left: `${baseIndent + level * indentStep + 12}px`,
                  top: "50%",
                  bottom: "0px",
                  width: "2px",
                  borderRadius: "1px",
                }}
              />
            )}
          </>
        )}

        <div
          className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg ${!isRenaming ? 'cursor-pointer' : ''} transition-all duration-200 group relative z-20 ${
            isDragOver
              ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 dark:ring-blue-600 shadow-sm"
              : isActive
              ? "bg-blue-50 dark:bg-blue-950/30"
              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
          style={{ marginLeft: paddingLeft }}
          onClick={!isRenaming ? () => toggleExpanded(folder._id) : undefined}
          onMouseEnter={() => setShowActions(folder._id)}
          onMouseLeave={() => setShowActions(null)}
        >
          {hasChildren && (
            <div className="flex-shrink-0 pointer-events-none">
              {isExpanded ? (
                <ChevronDown className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`} />
              )}
            </div>
          )}

          <span className="text-lg flex-shrink-0">
            {isExpanded ? (
              <FolderOpen className={`w-5 h-5 transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-400'
              }`} />
            ) : (
              <Folder className={`w-5 h-5 transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-400'
              }`} />
            )}
          </span>

          {isRenaming ? (
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onBlur={() => {
                if (folderName.trim() && folderName !== folder.name) {
                  handleRenameFolder(folder._id, folderName);
                } else {
                  cancelInlineRename();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (folderName.trim() && folderName !== folder.name) {
                    handleRenameFolder(folder._id, folderName);
                  } else {
                    cancelInlineRename();
                  }
                }
                if (e.key === 'Escape') {
                  cancelInlineRename();
                }
              }}
              className="flex-1 text-sm bg-transparent border-0 shadow-none p-0 h-auto focus-visible:ring-0"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`flex-1 truncate font-medium text-sm transition-colors ${
              isActive 
                ? 'text-blue-900 dark:text-blue-100' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {folder.name}
            </span>
          )}

          {showActions === folder._id && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateDocument(folder._id);
                }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all duration-200"
                title="Add document"
              >
                <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startInlineCreate(folder._id);
                }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all duration-200"
                title="Add subfolder"
              >
                <Folder className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startInlineRename(folder);
                }}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-all duration-200"
                title="Rename"
              >
                <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(folder._id);
                }}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all duration-200"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Inline folder creation for subfolders */}
            {isCreatingFolder && creatingFolderParentId === folder._id && (
              <div className="flex items-center gap-2 px-2 py-1.5" style={{ marginLeft: `${baseIndent + (level + 1) * indentStep}px` }}>
                <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <Input
                  value={tempFolderName}
                  onChange={(e) => setTempFolderName(e.target.value)}
                  onBlur={() => {
                    if (tempFolderName.trim()) {
                      handleCreateFolder(tempFolderName, folder._id);
                    } else {
                      cancelInlineCreate();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (tempFolderName.trim()) {
                        handleCreateFolder(tempFolderName, folder._id);
                      } else {
                        cancelInlineCreate();
                      }
                    }
                    if (e.key === 'Escape') {
                      cancelInlineCreate();
                    }
                  }}
                  className="flex-1 text-sm bg-transparent border-0 shadow-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Folder name"
                  autoFocus
                />
              </div>
            )}
            <FolderTree
              workspaceId={workspaceId}
              level={level + 1}
              parentId={folder._id}
              initialExpandedFolder={initialExpandedFolder}
            />
          </>
        )}
      </div>
    );
  };

  const renderDocument = (doc, isLast = false) => {
    const baseIndent = 6;
    const indentStep = 16;
    const documentIndent = baseIndent + (level + 1) * indentStep;
    const paddingLeft = `${documentIndent}px`;
    const isDragging = draggedItem && draggedItem._id === doc._id;
    const isSelected = location.pathname === `/document/${doc._id}`;
    
    // Modern color scheme for documents
    const lineColor = isSelected 
      ? 'border-blue-400 dark:border-blue-500' 
      : 'border-gray-200 dark:border-gray-700';
    const lineOpacity = isSelected ? 'opacity-100' : 'opacity-60';

    return (
      <div
        key={doc._id}
        draggable
        onDragStart={(e) => handleDragStart(e, doc, "document")}
        onDragEnd={handleDragEnd}
        className={`transition-opacity relative mb-1 ${
          isDragging ? "opacity-50" : "opacity-100"
        }`}
      >
        {/* Modern tree connecting lines for documents */}
        {level >= 0 && (
          <>
            {/* Vertical line from parent folder - only to this document */}
            <div
              className={`absolute transition-all duration-300 ${lineColor} ${lineOpacity}`}
              style={{
                left: `${baseIndent + level * indentStep + 12}px`,
                top: "0px",
                height: "50%",
                width: "2px",
                borderRadius: "1px",
              }}
            />
            {/* Continuation line to next document (if not last) */}
            {!isLast && (
              <div
                className={`absolute transition-all duration-300 border-gray-200 dark:border-gray-700 opacity-40`}
                style={{
                  left: `${baseIndent + level * indentStep + 12}px`,
                  top: "50%",
                  bottom: "0px",
                  width: "2px",
                  borderRadius: "1px",
                }}
              />
            )}
            {/* Horizontal connector to document */}
            <div
              className={`absolute transition-all duration-300 ${lineColor} ${lineOpacity}`}
              style={{
                left: `${baseIndent + level * indentStep + 12}px`,
                top: "50%",
                width: `${indentStep - 12}px`,
                height: "2px",
                borderRadius: "1px",
                transform: "translateY(-50%)",
              }}
            />
            {/* Connection dot for document */}
            <div
              className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isSelected 
                  ? 'bg-blue-500 dark:bg-blue-400 shadow-sm ring-2 ring-blue-200 dark:ring-blue-800' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={{
                left: `${baseIndent + level * indentStep + 10.25}px`,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
              }}
            />
          </>
        )}

        <Link
          to={`/document/${doc._id}`}
          className={`flex items-center gap-2 px-1 py-1.5 text-sm cursor-pointer transition-all duration-200 relative ${
            isSelected
              ? "bg-gradient-to-r from-transparent to-blue-50/80 dark:from-blue-950/40 rounded dark:to-blue-950/20 border-l-3 border-blue-500 dark:border-blue-400"
              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
          style={{ marginLeft: paddingLeft }}
          draggable={false}
        >
          <span className="text-lg cursor-move flex-shrink-0 transition-all duration-200">
            <span className={`inline-block ${
              isSelected ? 'scale-110' : 'scale-100'
            } transition-transform duration-200`}>
              {doc.emoji || "📄"}
            </span>
          </span>
          <div className="flex-1 min-w-0">
            <span
              className={`truncate block font-medium text-sm transition-all duration-200 ${
                isSelected
                  ? "text-blue-900 dark:text-blue-100"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {doc.title}
            </span>
            {doc.author && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">by</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={doc.author.image} alt={doc.author.name} />
                        <AvatarFallback className="text-xs">
                          {doc.author.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{doc.author.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          {isSelected && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 animate-pulse" />
              <div className="w-1 h-4 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0" />
            </div>
          )}
        </Link>
      </div>
    );
  };

  if (!folders && !documents) return null;

  // Handle drop on root level
  const handleRootDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.type !== "document") return;

    // Don't move if already at root
    if (!draggedItem.folderId) return;

    try {
      await moveDocument({
        documentId: draggedItem._id,
        folderId: null,
      });
      toast.success(`Moved "${draggedItem.title}" to root`);
    } catch (error) {
      toast.error("Failed to move document");
    }

    setDraggedItem(null);
  };

  const handleRootDragOver = (e) => {
    e.preventDefault();
    if (draggedItem && draggedItem.type === "document") {
      e.dataTransfer.dropEffect = "move";
    }
  };

  return (
    <div
      className="relative"
      onDragOver={level === 0 ? handleRootDragOver : undefined}
      onDrop={level === 0 ? handleRootDrop : undefined}
    >
      {/* Render folders */}
      {folders?.map((folder, index) => {
        const isLastItem = index === (folders?.length || 0) - 1 && (parentId ? documents?.length === 0 : documents?.filter(doc => !doc.folderId).length === 0);
        return renderFolder(folder, isLastItem);
      })}

      {/* Render documents */}
      {parentId
        ? documents?.map((doc, index) => renderDocument(doc, index === documents.length - 1))
        : level === 0 &&
          documents?.filter((doc) => !doc.folderId).map((doc, index, filteredDocs) => renderDocument(doc, index === filteredDocs.length - 1))}

      {/* Add folder button or inline creation at root level */}
      {level === 0 && (
        <>
          {isCreatingFolder && creatingFolderParentId === null ? (
            <div className="flex items-center gap-2 px-2 py-1.5 ml-1 mt-1">
              <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <Input
                value={tempFolderName}
                onChange={(e) => setTempFolderName(e.target.value)}
                onBlur={() => {
                  if (tempFolderName.trim()) {
                    handleCreateFolder(tempFolderName, null);
                  } else {
                    cancelInlineCreate();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (tempFolderName.trim()) {
                      handleCreateFolder(tempFolderName, null);
                    } else {
                      cancelInlineCreate();
                    }
                  }
                  if (e.key === 'Escape') {
                    cancelInlineCreate();
                  }
                }}
                className="flex-1 text-sm bg-transparent border-0 shadow-none p-0 h-auto focus-visible:ring-0"
                placeholder="Folder name"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => startInlineCreate(null)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-all duration-200 rounded-md w-full ml-1 mt-1 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
            >
              <Plus className="w-3 h-3" />
              <span>Add folder</span>
            </button>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? It will be moved to
              the trash where you can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFolderId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
