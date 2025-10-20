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
   - Wybór unikalnego username (subdomena username.hackerfolio.test)
   - Opcjonalny quick start wizard: import z GitHub lub start od zera
3. Zarządzanie sekcjami (CRUD)
   - Tworzenie, lista, edycja (nazwa, kolejność drag-and-drop, widoczność), usuwanie
   - Limit max 10 sekcji na portfolio
4. System komponentów
   - 6 typów: Text, Project Card, Pills, Social media links, List, Image
   - Formularze w drawerze, auto-save
   - Limit max 15 komponentów w portfolio
5. Import z GitHub
   - Wybór 3–10 repozytoriów
   - Generacja kart projektów z README oraz wykrytymi technologiami
6. Import z LinkedIn
   - Wklejenie linku, AI parse (GPT-4o-mini) do struktur JSON
   - Podgląd i edycja przed importem
7. Generowanie i publikacja
   - SSR na {username}.hackerfolio.test
   - Walidacja min. 1 sekcja przed publikacją
   - Obsługa publikacji zmian
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
  Tytuł: Logowanie przez email i hasło  
  Opis: Użytkownik może utworzyć konto i zalogować się przy użyciu email i hasła  
  Kryteria akceptacji:

  - Formularz rejestracji waliduje poprawny format email i wystarczającą długość hasła
  - Po rejestracji użytkownik otrzymuje sesję zalogowanego użytkownika
  - Błędy walidacji wyświetlane w formularzu

- ID: US-003  
  Tytuł: Wybór subdomeny  
  Opis: Po pierwszym logowaniu użytkownik wybiera unikalny username, który staje się subdomeną  
  Kryteria akceptacji:

  - System sprawdza unikalność subdomeny w czasie rzeczywistym
  - Po zapisaniu użytkownik nie może zmienić subdomeny później

- ID: US-004  
  Tytuł: Import z GitHub  
  Opis: Użytkownik wybiera 3–10 repozytoriów z GitHub do zaimportowania  
  Kryteria akceptacji:

  - Wyświetlana jest lista repozytoriów z konta użytkownika
  - Po zaznaczeniu i zatwierdzeniu generowane są karty projektów z danymi z README oraz wykrytymi technologiami

- ID: US-005  
  Tytuł: Import z LinkedIn  
  Opis: Użytkownik wkleja link do profilu LinkedIn, a AI parsuje dane  
  Kryteria akceptacji:

  - Po wklejeniu linku AI zwraca strukturę JSON z danymi personalnymi i doświadczeniem
  - Użytkownik może edytować dane przed importem

- ID: US-006  
  Tytuł: Tworzenie sekcji  
  Opis: Użytkownik może dodać nową sekcję do portfolio  
  Kryteria akceptacji:

  - Nowa sekcja pojawia się w panelu po lewej
  - Domyślna nazwa „Nowa sekcja” może być zmieniona

- ID: US-007  
  Tytuł: Edycja i porządkowanie sekcji  
  Opis: Użytkownik zmienia nazwę, kolejność drag-and-drop i widoczność sekcji  
  Kryteria akceptacji:

  - Zmiany kolejności i nazwy zapisują się automatycznie
  - Toggle widoczności odzwierciedla się w podglądzie

- ID: US-008  
  Tytuł: Usuwanie sekcji  
  Opis: Użytkownik usuwa wybraną sekcję  
  Kryteria akceptacji:

  - Po potwierdzeniu sekcja zostaje usunięta
  - System nie pozwala usunąć ostatniej sekcji przed publikacją

- ID: US-009  
  Tytuł: Dodawanie komponentu  
  Opis: Użytkownik dodaje komponent do sekcji za pomocą przycisku „Add Component”  
  Kryteria akceptacji:

  - Formularz drawer pozwala wybrać typ i wypełnić wymagane pola
  - Nowy komponent pojawia się w wybranej sekcji

- ID: US-010  
  Tytuł: Edycja komponentu  
  Opis: Użytkownik edytuje istniejący komponent w formularzu drawer  
  Kryteria akceptacji:

  - Zmiany zapisywane są automatycznie
  - Walidacja limitów znaków oraz rozmiaru obrazów

- ID: US-011  
  Tytuł: Usuwanie komponentu  
  Opis: Użytkownik usuwa komponent z sekcji  
  Kryteria akceptacji:

  - Po potwierdzeniu komponent znika z widoku i bazy danych

- ID: US-012  
  Tytuł: Podgląd portfolio  
  Opis: Użytkownik otwiera publiczny podgląd w nowej karcie  
  Kryteria akceptacji:

  - Link username.hackerfolio.test otwiera aktualny stan portfolio
  - Strona renderowana jest poprzez SSR

- ID: US-013  
  Tytuł: Publikacja portfolio  
  Opis: Użytkownik publikuje portfolio klikając „Publish”  
  Kryteria akceptacji:

  - System waliduje minimum jednej sekcji z co najmniej jednym komponentem
  - is_published ustawione na true, portfolio staje się publiczne

- ID: US-014  
  Tytuł: Ograniczenia sekcji i komponentów  
  Opis: System zapobiega przekroczeniu limitów 10 sekcji i 15 komponentów  
  Kryteria akceptacji:
  - Użytkownik otrzymuje komunikat przy próbie przekroczenia limitu

## 6. Metryki sukcesu

- Primary KPI: 90% użytkowników publikuje portfolio z co najmniej 1 sekcją
- Time to first publish: średnio <10 minut
- GitHub import adoption rate
- LinkedIn import adoption rate
- Średnia liczba sekcji i komponentów na portfolio
- 7-day retention rate
