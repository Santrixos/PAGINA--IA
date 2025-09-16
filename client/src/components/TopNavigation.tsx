import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Play, Share } from "lucide-react";
import type { Project } from "@shared/schema";

interface TopNavigationProps {
  project: Project | null;
}

export default function TopNavigation({ project }: TopNavigationProps) {
  return (
    <header className="bg-card border-b border-border px-4 py-2 flex items-center justify-between" data-testid="top-navigation">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <i className="fas fa-code text-primary text-xl"></i>
          <h1 className="text-lg font-semibold">WebCode AI Studio</h1>
        </div>
        <nav className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" data-testid="menu-file">
            Archivo
          </Button>
          <Button variant="ghost" size="sm" data-testid="menu-edit">
            Editar
          </Button>
          <Button variant="ghost" size="sm" data-testid="menu-view">
            Ver
          </Button>
          <Button variant="ghost" size="sm" data-testid="menu-terminal">
            Terminal
          </Button>
          <Button variant="ghost" size="sm" data-testid="menu-help">
            Ayuda
          </Button>
        </nav>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm" data-testid="button-run">
          <Play className="w-4 h-4 mr-1" />
          Ejecutar
        </Button>
        <Button variant="secondary" size="sm" data-testid="button-share">
          <Share className="w-4 h-4 mr-1" />
          Compartir
        </Button>
        <Avatar className="w-8 h-8 bg-accent" data-testid="user-avatar">
          <AvatarFallback className="text-accent-foreground text-xs">
            <i className="fas fa-user"></i>
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
