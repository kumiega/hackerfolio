import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface CardData {
  repo_url: string;
  title: string;
  summary: string;
  tech: string[];
}

interface CardFormProps {
  cards: CardData[];
  onChange: (field: string, value: unknown) => void;
  errors?: Record<string, string>;
}

export function CardForm({ cards, onChange, errors }: CardFormProps) {
  const safeCards = cards || [];

  const updateCard = (index: number, field: keyof CardData, value: string | string[]) => {
    const newCards = [...safeCards];
    newCards[index] = { ...newCards[index], [field]: value };
    onChange("cards", newCards);
  };

  const addCard = () => {
    if (safeCards.length >= 10) return;
    const newCards = [...safeCards, { repo_url: "", title: "", summary: "", tech: [] }];
    onChange("cards", newCards);
  };

  const removeCard = (index: number) => {
    const newCards = safeCards.filter((_, i) => i !== index);
    onChange("cards", newCards);
  };

  return (
    <div className="space-y-6">
      <Field className="items-stretch">
        <FieldLabel>Project Cards</FieldLabel>
        <FieldDescription>{safeCards.length}/10 cards</FieldDescription>
      </Field>

      <div className="space-y-6">
        {safeCards.map((card, index) => (
          <div key={index} className="border rounded-lg p-4 bg-transparent">
            <div className="flex items-center justify-end mb-4">
              {safeCards.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCard(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <Field className="items-stretch">
                <FieldLabel htmlFor={`repo_url_${index}`}>Repository URL</FieldLabel>
                <Input
                  id={`repo_url_${index}`}
                  value={card.repo_url || ""}
                  onChange={(e) => updateCard(index, "repo_url", e.target.value)}
                  placeholder="https://github.com/user/repo"
                />
              </Field>

              <Field className="items-stretch">
                <FieldLabel htmlFor={`title_${index}`}>Title</FieldLabel>
                <Input
                  id={`title_${index}`}
                  value={card.title || ""}
                  onChange={(e) => updateCard(index, "title", e.target.value)}
                  placeholder="Project title"
                  className={errors?.[`cards.${index}.title`] ? "border-destructive" : ""}
                />
                <FieldDescription>{(card.title || "").length}/100 characters</FieldDescription>
                <FieldError>{errors?.[`cards.${index}.title`]}</FieldError>
              </Field>

              <Field className="items-stretch">
                <FieldLabel htmlFor={`summary_${index}`}>Summary</FieldLabel>
                <Textarea
                  id={`summary_${index}`}
                  value={card.summary || ""}
                  onChange={(e) => updateCard(index, "summary", e.target.value)}
                  placeholder="Brief project description..."
                  rows={3}
                />
                <FieldDescription>{(card.summary || "").length}/500 characters</FieldDescription>
              </Field>

              <Field className="items-stretch">
                <FieldLabel htmlFor={`tech_${index}`}>Technologies</FieldLabel>
                <Textarea
                  id={`tech_${index}`}
                  value={card.tech?.join(", ") || ""}
                  onChange={(e) => {
                    const techArray = e.target.value
                      .split(",")
                      .map((t: string) => t.trim())
                      .filter(Boolean);
                    updateCard(index, "tech", techArray);
                  }}
                  placeholder="React, TypeScript, Node.js"
                  rows={2}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      {safeCards.length < 10 && (
        <Button type="button" variant="outline" onClick={addCard} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      )}
    </div>
  );
}
