
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptySectionsProps {
  onAddSection: () => void;
}

export function EmptySections({ onAddSection }: EmptySectionsProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
          <p className="text-muted-foreground mb-4">Create your first section to start building your portfolio</p>
          <Button onClick={onAddSection} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Section
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
