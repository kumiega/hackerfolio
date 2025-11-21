# Dokument wymagań produktu (PRD) - Hackerfolio

## 1. Przegląd produktu

Hackerfolio to aplikacja MVP umożliwiająca programistom szybkie i łatwe tworzenie profesjonalnego portfolio bez konieczności posiadania umiejętności designerskich. Integracja z GitHub i LinkedIn oraz wykorzystanie AI (GPT-4o-mini) pozwalają na wygenerowanie portfolio ad hoc w mniej niż 5 minut. Projekt oparty jest na Astro z React islands do interaktywności, UI shadcn-ui z Tailwind w dashboardzie, backend na Supabase oraz hosting na Digital Ocean z obsługą wildcard subdomen.

## 2. Problem użytkownika

Programiści aktywnie poszukujący pracy często nie mają czasu ani kompetencji do tworzenia estetycznych stron portfolio. Potrzebują rozwiązania, które:

- Szybko umożliwi prezentację projektów
- Zapewni profesjonalny wygląd bez konieczności kodowania
- Zautomatyzuje eksport danych z GitHub i LinkedIn

## 3. Wymagania funkcjonalne

1. Autoryzacja
   - GitHub OAuth
   - Email/hasło z Supabase Auth
2. Onboarding
   - Wybór unikalnego username (subdomena {username}.hackerfolio.com)
   - Opcjonalny quick start wizard: import z GitHub lub start od zera
3. Zarządzanie sekcjami i komponentami
   - Sekcje zawierają komponenty w strukturze JSONB
   - Edycja nazwy sekcji, kolejność drag-and-drop, widoczność
   - 6 typów komponentów: Text, Project Card, Pills, Links, List, Image
   - Formularze w drawerze, auto-save
   - Limit max 10 sekcji i max 15 komponentów na portfolio
5. Import z GitHub
   - Wybór 3–10 repozytoriów
   - Generacja kart projektów z README oraz wykrytymi technologiami
6. Import z LinkedIn
   - Ręczne wprowadzenie danych przez formularz (nazwa, headline, doświadczenie, edukacja)
   - AI generuje strukturę portfolio na podstawie wprowadzonych danych
   - Podgląd i edycja przed importem
7. Wersja robocza i publikacja
   - System draft/publish: użytkownik edytuje wersję roboczą (draft_data)
   - Publikacja kopiuje draft_data → published_data
   - Draft widoczny tylko dla właściciela w /preview/{username}
   - Opublikowane portfolio widoczne publicznie na {username}.hackerfolio.com
   - Walidacja min. 1 sekcja i 1 komponent przed publikacją
   - Możliwość publikacji nowych zmian (nadpisanie published_data)
8. Dashboard
   - Split view: lista sekcji (lewa) + edytor komponentów (prawa)
   - Drag-and-drop, toggle visibility, podgląd w nowej karcie
9. Strona landingowa
   - Hero z CTA, opis działania w 3 krokach, przykład portfolio, footer
   - Komunikat „Free during beta”

## 4. Granice produktu

- Jeden szablon w MVP
- Brak wsparcia dla niestandardowych domen
- Maksymalnie 10 sekcji i 15 komponentów
- Obrazy do 2 MB
- Limit znaków: 500 dla tekstów krótkich, 2000 dla długich
- Brak analityki wewnętrznej, CV/resume generation, wieloplatformowych portfolio

## 5. Historyjki użytkowników

- ID: US-001  
  Tytuł: Logowanie przez GitHub  
  Opis: Użytkownik inicjalizuje logowanie przez GitHub OAuth  
  Kryteria akceptacji:

  - Po kliknięciu „Login with GitHub” użytkownik zostaje przekierowany do GitHub OAuth
  - Po udanej autoryzacji następuje przekierowanie do aplikacji z sesją zalogowanego użytkownika
  - W przypadku błędu wyświetlany jest komunikat

- ID: US-002
  Tytuł: Onboarding
  Opis: Użytkownik przy pierwszym logowaniu przekierowany jest na onboarding.
  Kryteria akceptacji:

  - Przy pierwszej autoryzacji użytkownik jest oznaczony jako nowy i zostaje przeniesiony do formularza onboardingowego
  - Wejście na dashboard jest niemożliwe dopóki onboarding nie zostanie zakończony
  - Po wykonaniu wymaganych akcji użytkownik może pominąć dalsze kroki i zakończyć onboarding

- ID: US-003  
  Tytuł: Wybór subdomeny  
  Opis: Po pierwszym logowaniu użytkownik wybiera unikalny username, który staje się subdomeną  
  Kryteria akceptacji:

  - System sprawdza unikalność subdomeny w czasie rzeczywistym
  - Po zapisaniu użytkownik może zmienić subdomenę później, jeśli jest dostępna
  - Gdy subdomena jest wolna, użytkownik jest przeniesiony do kolejnego kroku
  - Po wybraniu subdomeny nie można cofnąć się do poprzedniego kroku

- ID: US-004
- Tytuł: Pominięcie onboardingu
- Opis: Możliwość pominięcia onboardingu po wybraniu subdomeny
  Kryteria akceptacji:
  
  - Użytkownik przechodzi do kolejnego kroku lub kończy proces onboardingu

- ID: US-005  
  Tytuł: Import z LinkedIn  
  Opis: Użytkownik wprowadza dane z LinkedIn przez formularz, AI generuje strukturę portfolio  
  Kryteria akceptacji:

  - Formularz pozwala wprowadzić nazwę, headline, doświadczenie zawodowe i edukację
  - AI generuje sekcje i komponenty na podstawie wprowadzonych danych
  - Użytkownik może edytować wygenerowaną strukturę przed zapisaniem

- ID: US-006  
  Tytuł: Import z GitHub  
  Opis: Użytkownik wybiera 1-10 repozytoriów z GitHub do zaimportowania  
  Kryteria akceptacji:

  - Wyświetlana jest lista repozytoriów z konta użytkownika
  - Po zaznaczeniu i zatwierdzeniu generowane są karty projektów z danymi z README oraz wykrytymi technologiami

- ID: US-006  
  Tytuł: Zarządzanie sekcjami i komponentami  
  Opis: Użytkownik edytuje portfolio przez dodawanie/edycję/usuwanie sekcji i komponentów  
  Kryteria akceptacji:

  - Użytkownik może dodać nową sekcję z domyślną nazwą „Nowa sekcja"
  - Może zmienić nazwę, kolejność (drag-and-drop) i widoczność sekcji
  - Może dodać komponent do sekcji wybierając typ i wypełniając formularz
  - Może edytować istniejące komponenty z auto-save
  - Może usunąć sekcje i komponenty
  - System waliduje limity: max 10 sekcji, max 15 komponentów
  - Wszystkie zmiany zapisują się do draft_data

- ID: US-007  
  Tytuł: Podgląd wersji roboczej  
  Opis: Użytkownik otwiera podgląd wersji roboczej w nowej karcie  
  Kryteria akceptacji:

  - Link /preview/{username} otwiera aktualny stan draft_data
  - Podgląd widoczny tylko dla zalogowanego właściciela
  - Strona renderowana jest poprzez SSR

- ID: US-008  
  Tytuł: Publikacja portfolio  
  Opis: Użytkownik publikuje portfolio klikając „Publish"  
  Kryteria akceptacji:

  - System waliduje minimum jednej sekcji z co najmniej jednym komponentem w draft_data
  - Publikacja kopiuje draft_data → published_data i ustawia last_published_at
  - Portfolio staje się publicznie dostępne na {username}.hackerfolio.com
  - Użytkownik może publikować kolejne zmiany (published_data zostaje nadpisane)

- ID: US-009  
  Tytuł: Ograniczenia sekcji i komponentów  
  Opis: System zapobiega przekroczeniu limitów 10 sekcji i 15 komponentów  
  Kryteria akceptacji:

  - Użytkownik otrzymuje komunikat przy próbie przekroczenia limitu
  - Walidacja odbywa się na poziomie aplikacji przy zapisie draft_data

## 6. Metryki sukcesu

- Primary KPI: 90% użytkowników publikuje portfolio z co najmniej 1 sekcją
- Time to first publish: średnio <10 minut
- GitHub import adoption rate
- LinkedIn import adoption rate
- Średnia liczba sekcji i komponentów na portfolio
- 7-day retention rate
