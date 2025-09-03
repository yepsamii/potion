import { useState } from "react";
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

export default function FolderTree({
  workspaceId,
  level = 0,
  parentId = null,
}) {
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showActions, setShowActions] = useState(null);

  const folders = useQuery(
    parentId ? api.folders.getChildFolders : api.folders.getRootFolders,
    workspaceId ? (parentId ? { parentId } : { workspaceId }) : "skip"
  );

  const documents = useQuery(
    api.documents.getRootDocuments,
    workspaceId && level === 0 ? { workspaceId } : "skip"
  );

  const createFolder = useMutation(api.folders.createFolder);
  const updateFolder = useMutation(api.folders.updateFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const createDocument = useMutation(api.documents.createDocument);

  const toggleExpanded = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async (parentFolderId = null) => {
    const name = prompt("Enter folder name:");
    if (!name) return;

    try {
      await createFolder({
        name,
        workspaceId,
        parentId: parentFolderId,
        emoji: "📁",
      });
      toast.success("Folder created!");
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const handleRenameFolder = async (folderId, currentName) => {
    const newName = prompt("Enter new name:", currentName);
    if (!newName || newName === currentName) return;

    try {
      await updateFolder({ id: folderId, name: newName });
      toast.success("Folder renamed!");
    } catch (error) {
      toast.error("Failed to rename folder");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to delete this folder?")) return;

    try {
      await deleteFolder({ id: folderId });
      toast.success("Folder moved to trash!");
    } catch (error) {
      toast.error("Failed to delete folder");
    }
  };

  const handleCreateDocument = async (folderId = null) => {
    try {
      await createDocument({
        title: "Untitled",
        workspaceId,
        parentId: folderId,
        emoji: "📄",
      });
      toast.success("Document created!");
    } catch (error) {
      toast.error("Failed to create document");
    }
  };

  const renderFolder = (folder) => {
    const isExpanded = expandedFolders.has(folder._id);
    const hasChildren = true; // We assume it might have children
    const paddingLeft = `${(level + 1) * 12}px`;

    return (
      <div
        key={folder._id}
        className="select-none"
      >
        <div
          className="flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-notion-gray-100 dark:hover:bg-notion-gray-800 cursor-pointer transition-colors group"
          style={{ paddingLeft }}
          onMouseEnter={() => setShowActions(folder._id)}
          onMouseLeave={() => setShowActions(null)}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(folder._id)}
              className="p-0.5 hover:bg-notion-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          <span className="text-base">
            {isExpanded ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </span>

          <span className="flex-1 truncate">{folder.name}</span>

          {showActions === folder._id && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleCreateDocument(folder._id)}
                className="p-1 hover:bg-notion-gray-200 rounded"
                title="Add document"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleCreateFolder(folder._id)}
                className="p-1 hover:bg-notion-gray-200 rounded"
                title="Add subfolder"
              >
                <Folder className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleRenameFolder(folder._id, folder.name)}
                className="p-1 hover:bg-notion-gray-200 rounded"
                title="Rename"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteFolder(folder._id)}
                className="p-1 hover:bg-red-100 text-red-600 rounded"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <FolderTree
            workspaceId={workspaceId}
            level={level + 1}
            parentId={folder._id}
          />
        )}
      </div>
    );
  };

  const renderDocument = (doc) => {
    const paddingLeft = `${(level + 1) * 12}px`;

    return (
      <Link
        key={doc._id}
        to={`/document/${doc._id}`}
        className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-notion-gray-100 dark:hover:bg-notion-gray-800 cursor-pointer transition-colors ${
          location.pathname === `/document/${doc._id}`
            ? "bg-notion-gray-200 dark:bg-notion-gray-700"
            : ""
        }`}
        style={{ paddingLeft }}
      >
        <span className="text-base">{doc.emoji || "📄"}</span>
        <span className="truncate flex-1">{doc.title}</span>
      </Link>
    );
  };

  if (!folders && !documents) return null;

  return (
    <div className="space-y-1">
      {/* Render folders */}
      {folders?.map(renderFolder)}

      {/* Render documents at root level */}
      {level === 0 &&
        documents?.filter((doc) => !doc.parentId).map(renderDocument)}

      {/* Add folder button at root level */}
      {level === 0 && (
        <button
          onClick={() => handleCreateFolder()}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-notion-gray-100 dark:hover:bg-notion-gray-800 cursor-pointer transition-colors rounded-md w-full"
        >
          <Plus className="w-4 h-4" />
          <span>Add folder</span>
        </button>
      )}
    </div>
  );
}
