"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, Save, Trash2, Edit3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl: string;
  liveUrl: string;
}

export function EditorContent() {
  const [profile, setProfile] = useState({
    name: "",
    title: "",
    bio: "",
    email: "",
    location: "",
  });

  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      title: "Sample Project",
      description: "A sample project to demonstrate the portfolio editor",
      technologies: ["React", "TypeScript", "Tailwind CSS"],
      githubUrl: "https://github.com/example/project",
      liveUrl: "https://example-project.com",
    },
  ]);

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: "",
    description: "",
    technologies: [],
    githubUrl: "",
    liveUrl: "",
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    // TODO: Implement API call to save profile
    console.log("Saving profile:", profile);
  };

  const handleAddProject = () => {
    if (newProject.title && newProject.description) {
      const project: Project = {
        id: Date.now().toString(),
        title: newProject.title,
        description: newProject.description,
        technologies: newProject.technologies || [],
        githubUrl: newProject.githubUrl || "",
        liveUrl: newProject.liveUrl || "",
      };
      setProjects((prev) => [...prev, project]);
      setNewProject({
        title: "",
        description: "",
        technologies: [],
        githubUrl: "",
        liveUrl: "",
      });
    }
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const handleEditProject = (id: string) => {
    setEditingProject(id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setNewProject(project);
    }
  };

  const handleSaveProject = () => {
    if (editingProject && newProject.title && newProject.description) {
      setProjects((prev) =>
        prev.map((project) => (project.id === editingProject ? ({ ...project, ...newProject } as Project) : project))
      );
      setEditingProject(null);
      setNewProject({
        title: "",
        description: "",
        technologies: [],
        githubUrl: "",
        liveUrl: "",
      });
    }
  };

  const addTechnology = (tech: string) => {
    if (tech.trim() && !newProject.technologies?.includes(tech.trim())) {
      setNewProject((prev) => ({
        ...prev,
        technologies: [...(prev.technologies || []), tech.trim()],
      }));
    }
  };

  const removeTechnology = (tech: string) => {
    setNewProject((prev) => ({
      ...prev,
      technologies: prev.technologies?.filter((t) => t !== tech) || [],
    }));
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Editor</h1>
          <p className="text-muted-foreground">Edit your profile and showcase your projects</p>
        </div>
        <Button onClick={handleSaveProfile} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and bio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Professional Title</Label>
                <Input
                  id="title"
                  value={profile.title}
                  onChange={(e) => handleProfileChange("title", e.target.value)}
                  placeholder="e.g., Full Stack Developer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => handleProfileChange("location", e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => handleProfileChange("bio", e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Manage your portfolio projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add/Edit Project Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-title">Project Title</Label>
                <Input
                  id="project-title"
                  value={newProject.title || ""}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={newProject.description || ""}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Project description"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github-url">GitHub URL</Label>
                  <Input
                    id="github-url"
                    value={newProject.githubUrl || ""}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, githubUrl: e.target.value }))}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="live-url">Live URL</Label>
                  <Input
                    id="live-url"
                    value={newProject.liveUrl || ""}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, liveUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newProject.technologies?.map((tech) => (
                    <Badge key={tech} variant="secondary" className="gap-1">
                      {tech}
                      <button onClick={() => removeTechnology(tech)} className="ml-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add technology"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addTechnology(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {editingProject ? (
                  <>
                    <Button onClick={handleSaveProject} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Project
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProject(null);
                        setNewProject({
                          title: "",
                          description: "",
                          technologies: [],
                          githubUrl: "",
                          liveUrl: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleAddProject} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Projects List */}
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{project.title}</h4>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProject(project.id)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
