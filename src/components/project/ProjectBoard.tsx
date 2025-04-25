"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "react-bootstrap";
import { Person } from "@/app/models/models";
import EditProjectModal from "@/components/project/EditProjectModal";
import DocumentationModal from "@/components/project/ProjectDocumentationModal";

interface Project {
  id: number;
  title: string;
  description: string;
  users: string;
}

interface ProjectBoardProps {
  project: Project;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ project }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentationModal, setShowDocumentationModal] = useState(false);
  const [projectData, setProjectData] = useState(project);

  const handleProjectEdited = (updated: Project & { message?: string }) => {
    if (updated.message === "No changes detected") {
      setShowEditModal(false);
      return;
    }

    setProjectData(updated);
    setShowEditModal(false);
  };

  const isAllowed = (() => {
    if (!session) return false;
    const user = session.user as Person;
    const isAdmin = user.role === 2;
    const isScrumMaster = project.users?.includes(`Scrum Master: ${user.username} `);
    return isAdmin || isScrumMaster;
  })();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg relative">
      {/* Header vrstice */}
      <div className="flex justify-between items-center mb-2">
        <h2
          className="text-2xl font-bold cursor-pointer hover:underline"
          onClick={() => router.push(`/project/${projectData.id}`)}
        >
          {projectData.title}
        </h2>
          <div className="flex gap-2">
          {isAllowed && (
            <Button variant="primary" className="text-sm" onClick={() => setShowEditModal(true)}>
              Edit
            </Button>
          )}
            <Button variant="secondary" className="text-sm" onClick={() => setShowDocumentationModal(true)}>
              Documentation
            </Button>
          </div>

      </div>

      {/* Opis projekta */}
      <p className="whitespace-pre-wrap text-gray-700 mb-2">{projectData.description}</p>

      {/* Ekipa */}
      {project.users ? (
        <div className="text-gray-500 text-sm mb-4">
          <span>Product Owner: {projectData.users.split("|")[0]?.replace("Product Owner: ", "")}</span><br />
          <span>Scrum Master: {projectData.users.split("|")[1]?.replace("Scrum Master: ", "")}</span><br />
          <span>Developers: {projectData.users.split("|")[2]?.replace("Developers: ", "")}</span>
        </div>
      ) : (
        <div className="text-gray-500 text-sm mb-4">No team assigned</div>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditProjectModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          project={projectData}
          onProjectEdited={handleProjectEdited}
        />
      )}
      {showDocumentationModal && (
        <DocumentationModal
          show={showDocumentationModal}
          onHide={() => setShowDocumentationModal(false)}
          projectId={projectData.id}
        />
      )}
    </div>
  );
};

export default ProjectBoard;