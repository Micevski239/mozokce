import json
import os
import sys
import customtkinter as ctk
from deck import (
    DeckState,
    build_explanation,
    format_correct_choices,
    load_cards,
    save_cards,
    shuffle_card_bank,
    sync_cards_to_bank,
)
from sessions import (
    MASTERED_THRESHOLD,
    TAINTED_THRESHOLD,
    clear_tainted_questions,
    clear_mastered_state,
    clear_wrong_cards,
    delete_session_at,
    load_mastered_cards,
    load_mastery_progress,
    load_sessions,
    load_tainted_questions,
    load_wrong_cards,
    save_tainted_questions,
    mastered_question_set,
    load_redemption_strikes,
    load_wrong_strikes,
    merge_wrong_cards,
    record_wrong_strike,
    save_redemption_strikes,
    save_wrong_strikes,
    save_session,
    summarize_sessions,
    sync_tainted_with_wrong_cards,
    tainted_question_set,
    update_mastered_cards,
)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

LETTERS = list("abcdefghijklmnopqrstuvwxyz")
CLR_DEFAULT = "#1e293b"
CLR_SELECTED = "#1e3a5f"
CLR_CORRECT = "#052e16"
CLR_WRONG = "#3b0a0a"
CLR_FADED = "#0f172a"
TXT_CORRECT = "#4ade80"
TXT_WRONG = "#f87171"
TXT_FADED = "#475569"
TXT_DEFAULT = "#e2e8f0"
MODE_LABELS = {
    "main": "Main deck",
    "missed": "Missed from last session",
    "wrong_set": "Wrong Set review",
    "mastered": "Mastered review",
}


class FlashcardApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Study Flashcards")
        self.attributes("-fullscreen", True)
        self.bind("<Escape>", self._exit_fullscreen)
        self.bind("<Configure>", self._handle_resize)

        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.subject_name = None
        self.subject_dir = None
        self.cards_path = ""
        self.sessions_path = ""
        self.wrong_cards_path = ""
        self.mastered_cards_path = ""
        self.mastery_progress_path = ""
        self.tainted_path = ""
        self.wrong_strikes_path = ""
        self.redemption_strikes_path = ""
        self.shuffle_var = ctk.BooleanVar(value=False)

        self.deck = DeckState([])
        self._error = None
        self._empty_message = "No cards found.\nAsk Claude to add some questions!"
        self._deck_mode = "main"
        self._mastered_hidden_count = 0
        self._selected = set()
        self._answered = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self._session_saved = False
        self._last_screen = "quiz"
        self._sessions_back_target = "quiz"
        self._tainted_back_target = "quiz"
        self._wrong_count = 0
        self._mastered_count = 0
        self._resize_after_id = None
        self._last_question_wraplength = None
        self._last_choice_wraplength = None
        self._new_session_dialog = None

        self._build_subjects_ui()
        self._build_quiz_ui()
        self._build_summary_ui()
        self._build_sessions_ui()
        self._build_tainted_ui()
        self._build_guide_ui()
        self._show_subjects()

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_subjects_ui(self):
        self.subjects_frame = ctk.CTkFrame(self, fg_color="transparent")

        ctk.CTkLabel(
            self.subjects_frame, text="Choose Subject",
            font=ctk.CTkFont(size=24, weight="bold")
        ).pack(pady=(36, 6))
        ctk.CTkLabel(
            self.subjects_frame,
            text="Each subject is a folder that contains its own cards, sessions, and review sets.",
            font=ctk.CTkFont(size=12),
            text_color="#94a3b8",
        ).pack()

        self.subjects_scroll = ctk.CTkScrollableFrame(self.subjects_frame, height=520)
        self.subjects_scroll.pack(fill="both", expand=True, padx=24, pady=(24, 16))

        actions = ctk.CTkFrame(self.subjects_frame, fg_color="transparent")
        actions.pack(pady=(0, 24))
        ctk.CTkButton(
            actions, text="Reset All Progress", width=160,
            fg_color="#7f1d1d", hover_color="#991b1b",
            command=self._reset_all_progress
        ).pack()

    def _build_quiz_ui(self):
        self.quiz_frame = ctk.CTkFrame(self, fg_color="transparent")

        header = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(15, 6))
        top_row = ctk.CTkFrame(header, fg_color="transparent")
        top_row.pack(fill="x")
        title_group = ctk.CTkFrame(top_row, fg_color="transparent")
        title_group.pack(side="left")
        ctk.CTkLabel(title_group, text="Study Flashcards",
                     font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w")
        self.mode_label = ctk.CTkLabel(
            title_group, text="", font=ctk.CTkFont(size=11), text_color="#94a3b8"
        )
        self.mode_label.pack(anchor="w", pady=(2, 0))

        # Row 1: Navigation
        nav_row = ctk.CTkFrame(top_row, fg_color="transparent")
        nav_row.pack(side="right")
        ctk.CTkButton(nav_row, text="Subjects", width=80,
                      fg_color="#334155", hover_color="#475569",
                      command=self._show_subjects).pack(side="left", padx=3)
        ctk.CTkButton(nav_row, text="Home", width=80,
                      fg_color="#334155", hover_color="#475569",
                      command=lambda: self._show_sessions("quiz")).pack(side="left", padx=3)
        ctk.CTkButton(nav_row, text="Водич", width=80,
                      fg_color="#065f46", hover_color="#047857",
                      command=lambda: self._show_guide("quiz")).pack(side="left", padx=3)
        ctk.CTkSwitch(nav_row, text="Shuffle", variable=self.shuffle_var,
                      command=self._toggle_shuffle).pack(side="left", padx=(8, 0))

        # Row 2: Deck actions
        actions_row = ctk.CTkFrame(header, fg_color="transparent")
        actions_row.pack(anchor="e", pady=(4, 0))
        self.wrong_set_btn = ctk.CTkButton(
            actions_row, text="Wrong Set", width=100,
            fg_color="#0f766e", hover_color="#115e59",
            command=self._start_wrong_set
        )
        self.wrong_set_btn.pack(side="left", padx=3)
        self.mastered_set_btn = ctk.CTkButton(
            actions_row, text="Mastered", width=100,
            fg_color="#1d4ed8", hover_color="#1e40af",
            command=self._start_mastered_set
        )
        self.mastered_set_btn.pack(side="left", padx=3)
        ctk.CTkButton(
            actions_row, text="Reset Mastered", width=110,
            fg_color="#7c3aed", hover_color="#6d28d9",
            command=self._reset_mastered_to_main
        ).pack(side="left", padx=3)
        ctk.CTkButton(actions_row, text="New Session", width=95,
                      fg_color="#2563eb", hover_color="#1d4ed8",
                      command=self._new_session).pack(side="left", padx=3)
        ctk.CTkButton(actions_row, text="Start Over", width=85,
                      fg_color="#334155", hover_color="#475569",
                      command=self._restart_current_session).pack(side="left", padx=3)
        ctk.CTkButton(actions_row, text="Delete", width=70,
                      fg_color="#991b1b", hover_color="#b91c1c",
                      command=self._delete_current_question).pack(side="left", padx=3)
        ctk.CTkButton(actions_row, text="Finish", width=70,
                      fg_color="#7c2d12", hover_color="#9a3412",
                      command=self._finish_session).pack(side="left", padx=3)

        self.counter_label = ctk.CTkLabel(header, text="",
                                          font=ctk.CTkFont(size=12))
        self.counter_label.pack(anchor="e", pady=(6, 0))

        self.progress = ctk.CTkProgressBar(self.quiz_frame)
        self.progress.pack(fill="x", padx=20, pady=(0, 10))
        self.progress.set(0)

        self.question_frame = ctk.CTkFrame(self.quiz_frame, corner_radius=10)
        self.question_frame.pack(fill="x", padx=20, pady=(0, 10))
        self.question_label = ctk.CTkLabel(
            self.question_frame, text="",
            font=ctk.CTkFont(size=16), wraplength=1100, justify="center"
        )
        self.question_label.pack(fill="x", padx=20, pady=20)

        self.choices_frame = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        self.choices_frame.pack(fill="x", padx=20)
        self.choice_btns = []
        self._ensure_choice_buttons(4)

        self.action_frame = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        self.action_frame.pack(pady=(8, 0))
        self.submit_btn = ctk.CTkButton(self.action_frame, text="Submit",
                                        width=130, command=self._submit)
        self.next_btn = ctk.CTkButton(self.action_frame, text="Next →",
                                      width=130, command=self._next_card)

        self.feedback_frame = ctk.CTkFrame(self.quiz_frame, corner_radius=10)
        self.result_label = ctk.CTkLabel(
            self.feedback_frame, text="",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        self.result_label.pack(anchor="w", padx=18, pady=(14, 6))
        self.explanation_label = ctk.CTkLabel(
            self.feedback_frame, text="",
            font=ctk.CTkFont(size=13), wraplength=1100, justify="left"
        )
        self.explanation_label.pack(fill="x", padx=18, pady=(0, 14))

        self.hint_label = ctk.CTkLabel(self.quiz_frame, text="",
                                       font=ctk.CTkFont(size=10),
                                       text_color="gray")
        self.hint_label.pack(pady=(6, 0))

    def _ensure_choice_buttons(self, count):
        while len(self.choice_btns) < count:
            idx = len(self.choice_btns)
            btn = ctk.CTkButton(
                self.choices_frame, text="", anchor="w", height=44,
                fg_color=CLR_DEFAULT, hover_color="#334155",
                text_color=TXT_DEFAULT,
                command=lambda choice_idx=idx: self._select_choice(choice_idx)
            )
            btn.pack(fill="x", pady=3)
            self.choice_btns.append(btn)

    def _build_summary_ui(self):
        self.summary_frame = ctk.CTkFrame(self, fg_color="transparent")

        ctk.CTkLabel(self.summary_frame, text="Session Complete",
                     font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(40, 4))
        self.summary_hint_label = ctk.CTkLabel(
            self.summary_frame, text="Saved to sessions.json",
            font=ctk.CTkFont(size=11), text_color="gray"
        )
        self.summary_hint_label.pack()

        self.score_label = ctk.CTkLabel(self.summary_frame, text="0%",
                                        font=ctk.CTkFont(size=52, weight="bold"),
                                        text_color="#7dd3fc")
        self.score_label.pack(pady=(24, 4))
        self.score_sub_label = ctk.CTkLabel(self.summary_frame, text="",
                                            font=ctk.CTkFont(size=13),
                                            text_color="#94a3b8")
        self.score_sub_label.pack()

        self.missed_header = ctk.CTkLabel(self.summary_frame, text="",
                                          font=ctk.CTkFont(size=10),
                                          text_color="#f87171")
        self.missed_header.pack(pady=(20, 6))
        self.missed_scroll = ctk.CTkScrollableFrame(self.summary_frame, height=130)
        self.missed_scroll.pack(fill="x", padx=50)

        btn_row = ctk.CTkFrame(self.summary_frame, fg_color="transparent")
        btn_row.pack(pady=24)
        ctk.CTkButton(btn_row, text="Retry Missed", width=140,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._retry_missed).pack(side="left", padx=8)
        self.summary_wrong_btn = ctk.CTkButton(
            btn_row, text="Wrong Set", width=140,
            fg_color="#0f766e", hover_color="#115e59",
            command=self._start_wrong_set
        )
        self.summary_wrong_btn.pack(side="left", padx=8)
        self.summary_mastered_btn = ctk.CTkButton(
            btn_row, text="Mastered", width=140,
            fg_color="#1d4ed8", hover_color="#1e40af",
            command=self._start_mastered_set
        )
        self.summary_mastered_btn.pack(side="left", padx=8)
        ctk.CTkButton(
            btn_row, text="Reset Mastered", width=140,
            fg_color="#7c3aed", hover_color="#6d28d9",
            command=self._reset_mastered_to_main
        ).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Subjects", width=140,
                      fg_color="#334155", hover_color="#475569",
                      command=self._show_subjects).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="New Session", width=140,
                      command=self._new_session).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Home", width=140,
                      fg_color="#334155", hover_color="#475569",
                      command=lambda: self._show_sessions("summary")).pack(side="left", padx=8)

    def _build_sessions_ui(self):
        self.sessions_frame = ctk.CTkFrame(self, fg_color="transparent")

        # ── Navbar ────────────────────────────────────────────────────────────
        navbar = ctk.CTkFrame(self.sessions_frame, fg_color="#0f172a", corner_radius=0)
        navbar.pack(fill="x")
        self.sessions_subject_label = ctk.CTkLabel(
            navbar, text="", font=ctk.CTkFont(size=20, weight="bold")
        )
        self.sessions_subject_label.pack(side="left", padx=20, pady=14)

        # ── Section Sets ──────────────────────────────────────────────────────
        sets_card = ctk.CTkFrame(self.sessions_frame, fg_color="#1e293b", corner_radius=10)
        sets_card.pack(fill="x", padx=20, pady=(16, 0))
        ctk.CTkLabel(
            sets_card, text="Start Session",
            font=ctk.CTkFont(size=12, weight="bold"), text_color="#94a3b8"
        ).pack(anchor="w", padx=16, pady=(12, 6))
        sets_btns = ctk.CTkFrame(sets_card, fg_color="transparent")
        sets_btns.pack(padx=12, pady=(0, 14), fill="x")
        ctk.CTkButton(
            sets_btns, text="Main Deck", width=180,
            command=self._start_main_session
        ).pack(side="left", padx=(0, 8))
        self.home_wrong_btn = ctk.CTkButton(
            sets_btns, text="Wrong Set", width=180,
            fg_color="#0f766e", hover_color="#115e59",
            command=self._start_wrong_set
        )
        self.home_wrong_btn.pack(side="left", padx=(0, 8))
        self.home_mastered_btn = ctk.CTkButton(
            sets_btns, text="Mastered", width=180,
            fg_color="#1d4ed8", hover_color="#1e40af",
            command=self._start_mastered_set
        )
        self.home_mastered_btn.pack(side="left")

        # ── Stats row ─────────────────────────────────────────────────────────
        stats_row = ctk.CTkFrame(self.sessions_frame, fg_color="transparent")
        stats_row.pack(fill="x", padx=20, pady=(14, 0))
        self.sessions_count_label = self._build_stat_card(stats_row, "Sessions")
        self.sessions_avg_label = self._build_stat_card(stats_row, "Average")
        self.sessions_best_label = self._build_stat_card(stats_row, "Best")
        self.sessions_last_label = self._build_stat_card(stats_row, "Last")
        self.sessions_wrong_label = self._build_stat_card(stats_row, "Wrong Set")
        self.sessions_mastered_label = self._build_stat_card(stats_row, "Mastered")

        # ── Session History ───────────────────────────────────────────────────
        hist_header = ctk.CTkFrame(self.sessions_frame, fg_color="transparent")
        hist_header.pack(fill="x", padx=20, pady=(14, 4))
        ctk.CTkLabel(
            hist_header, text="Session History",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(side="left")

        self.sessions_scroll = ctk.CTkScrollableFrame(self.sessions_frame, height=240)
        self.sessions_scroll.pack(fill="both", expand=True, padx=20)

        # ── Tools ─────────────────────────────────────────────────────────────
        tools_card = ctk.CTkFrame(self.sessions_frame, fg_color="#1e293b", corner_radius=10)
        tools_card.pack(fill="x", padx=20, pady=(12, 16))
        ctk.CTkLabel(
            tools_card, text="Tools",
            font=ctk.CTkFont(size=12, weight="bold"), text_color="#94a3b8"
        ).pack(anchor="w", padx=16, pady=(12, 6))
        tools_btns = ctk.CTkFrame(tools_card, fg_color="transparent")
        tools_btns.pack(padx=12, pady=(0, 14), fill="x")
        ctk.CTkButton(
            tools_btns, text="Reset Mastered", width=150,
            fg_color="#7c3aed", hover_color="#6d28d9",
            command=self._reset_mastered_to_main
        ).pack(side="left", padx=(0, 8))
        ctk.CTkButton(
            tools_btns, text="Tainted", width=130,
            fg_color="#92400e", hover_color="#b45309",
            command=lambda: self._show_tainted("sessions")
        ).pack(side="left", padx=(0, 8))
        ctk.CTkButton(
            tools_btns, text="Subjects", width=130,
            fg_color="#334155", hover_color="#475569",
            command=self._show_subjects
        ).pack(side="left")

    def _build_tainted_ui(self):
        self.tainted_frame = ctk.CTkFrame(self, fg_color="transparent")

        ctk.CTkLabel(self.tainted_frame, text="Tainted Questions",
                     font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(24, 4))
        ctk.CTkLabel(
            self.tainted_frame,
            text="Questions you've ever answered wrong. These are blocked from earning mastery streaks.",
            font=ctk.CTkFont(size=11), text_color="gray",
        ).pack()

        self.tainted_count_label = ctk.CTkLabel(
            self.tainted_frame, text="", font=ctk.CTkFont(size=13), text_color="#f87171"
        )
        self.tainted_count_label.pack(pady=(10, 0))

        self.tainted_scroll = ctk.CTkScrollableFrame(self.tainted_frame, height=440)
        self.tainted_scroll.pack(fill="both", expand=True, padx=20, pady=(10, 0))

        btn_row = ctk.CTkFrame(self.tainted_frame, fg_color="transparent")
        btn_row.pack(pady=16)
        ctk.CTkButton(btn_row, text="Back", width=120,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._back_from_tainted).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Clear All Tainted", width=150,
                      fg_color="#7f1d1d", hover_color="#991b1b",
                      command=self._clear_all_tainted).pack(side="left", padx=8)

    def _refresh_tainted_ui(self):
        for w in self.tainted_scroll.winfo_children():
            w.destroy()

        questions = sorted(load_tainted_questions(self.tainted_path))
        self.tainted_count_label.configure(text=f"{len(questions)} tainted question(s)")

        if not questions:
            ctk.CTkLabel(self.tainted_scroll, text="No tainted questions.",
                         text_color="#94a3b8").pack(pady=30)
            return

        for q in questions:
            row = ctk.CTkFrame(self.tainted_scroll, fg_color="#1e293b", corner_radius=8)
            row.pack(fill="x", pady=4, padx=4)
            ctk.CTkLabel(row, text=q, wraplength=580, justify="left",
                         anchor="w", font=ctk.CTkFont(size=12)).pack(
                side="left", fill="x", expand=True, padx=12, pady=10)
            ctk.CTkButton(
                row, text="Remove", width=80,
                fg_color="#334155", hover_color="#475569",
                command=lambda question=q: self._remove_tainted(question)
            ).pack(side="right", padx=8, pady=8)

    def _show_tainted(self, back_target=None):
        self._tainted_back_target = back_target or self._last_screen
        self._refresh_tainted_ui()
        self._hide_frames()
        self.tainted_frame.pack(fill="both", expand=True)

    def _back_from_tainted(self):
        if self._tainted_back_target == "sessions":
            self._show_sessions()
        else:
            self._show_quiz()

    def _remove_tainted(self, question):
        remaining = [q for q in load_tainted_questions(self.tainted_path)
                     if str(q).strip() != question]
        save_tainted_questions(remaining, self.tainted_path)
        self._refresh_tainted_ui()

    def _clear_all_tainted(self):
        confirmed = ctk.CTkInputDialog(
            text="Ова ќе ги отстрани сите tainted прашања и ќе им дозволи да добиваат streak.\nВнеси 'CLEAR' за да потврдиш:",
            title="Clear All Tainted"
        ).get_input()
        if confirmed != "CLEAR":
            return
        save_tainted_questions([], self.tainted_path)
        self._refresh_tainted_ui()

    def _build_guide_ui(self):
        self.guide_frame = ctk.CTkFrame(self, fg_color="transparent")
        self._guide_back_target = "quiz"
        self._guide_data = self._load_guide_data()

        # Header
        header = ctk.CTkFrame(self.guide_frame, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(15, 6))
        ctk.CTkLabel(header, text="Водич за учење",
                     font=ctk.CTkFont(size=20, weight="bold")).pack(side="left")
        ctk.CTkButton(header, text="Назад", width=90,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._back_from_guide).pack(side="right")

        # Body: sidebar + content
        body = ctk.CTkFrame(self.guide_frame, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=20, pady=(6, 10))

        # Sidebar with section buttons
        sidebar = ctk.CTkFrame(body, width=260, fg_color="#1e293b", corner_radius=10)
        sidebar.pack(side="left", fill="y", padx=(0, 10))
        sidebar.pack_propagate(False)

        ctk.CTkLabel(sidebar, text="Материјал",
                     font=ctk.CTkFont(size=13, weight="bold"),
                     text_color="#94a3b8").pack(pady=(14, 6), padx=12, anchor="w")

        self._guide_section_btns = []
        sections = self._guide_data.get("sections", [])
        for i, sec in enumerate(sections):
            btn = ctk.CTkButton(
                sidebar, text=sec["title"], anchor="w", height=36,
                fg_color="transparent", hover_color="#334155",
                text_color=TXT_DEFAULT,
                font=ctk.CTkFont(size=12),
                command=lambda idx=i: self._show_guide_section(idx)
            )
            btn.pack(fill="x", padx=8, pady=2)
            self._guide_section_btns.append(btn)

        # Plan button in sidebar
        ctk.CTkLabel(sidebar, text="",
                     fg_color="#334155", height=1).pack(fill="x", padx=12, pady=(10, 10))
        ctk.CTkLabel(sidebar, text="План за учење",
                     font=ctk.CTkFont(size=13, weight="bold"),
                     text_color="#94a3b8").pack(pady=(0, 6), padx=12, anchor="w")
        self._guide_plan_btn = ctk.CTkButton(
            sidebar, text="5-дневен план", anchor="w", height=36,
            fg_color="transparent", hover_color="#334155",
            text_color=TXT_DEFAULT,
            font=ctk.CTkFont(size=12),
            command=self._show_guide_plan
        )
        self._guide_plan_btn.pack(fill="x", padx=8, pady=2)

        # Content area
        self._guide_content_scroll = ctk.CTkScrollableFrame(
            body, fg_color="#0f172a", corner_radius=10
        )
        self._guide_content_scroll.pack(side="left", fill="both", expand=True)

        self._guide_content_title = ctk.CTkLabel(
            self._guide_content_scroll, text="",
            font=ctk.CTkFont(size=18, weight="bold"),
            wraplength=700, justify="left", anchor="w"
        )
        self._guide_content_title.pack(fill="x", padx=20, pady=(20, 2), anchor="w")

        self._guide_content_subtitle = ctk.CTkLabel(
            self._guide_content_scroll, text="",
            font=ctk.CTkFont(size=12), text_color="#94a3b8",
            anchor="w"
        )
        self._guide_content_subtitle.pack(fill="x", padx=20, pady=(0, 12), anchor="w")

        self._guide_content_body = ctk.CTkLabel(
            self._guide_content_scroll, text="",
            font=ctk.CTkFont(size=14), wraplength=700,
            justify="left", anchor="nw"
        )
        self._guide_content_body.pack(fill="both", padx=20, pady=(0, 20), anchor="nw")

        # Plan widgets (hidden by default, shown when plan is selected)
        self._guide_plan_frame = ctk.CTkFrame(
            self._guide_content_scroll, fg_color="transparent"
        )

    def _load_guide_data(self):
        guide_path = os.path.join(self.base_path, "study_guide.json")
        if not os.path.exists(guide_path):
            return {"sections": [], "study_plan": []}
        try:
            with open(guide_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"sections": [], "study_plan": []}

    def _show_guide(self, back_target=None):
        self._guide_back_target = back_target or self._last_screen
        self._hide_frames()
        self.guide_frame.pack(fill="both", expand=True)
        # Show first section by default
        sections = self._guide_data.get("sections", [])
        if sections:
            self._show_guide_section(0)
        else:
            self._guide_content_title.configure(text="Нема содржина")
            self._guide_content_subtitle.configure(text="")
            self._guide_content_body.configure(text="Додадете study_guide.json во главниот директориум.")

    def _show_guide_section(self, idx):
        sections = self._guide_data.get("sections", [])
        if idx >= len(sections):
            return
        sec = sections[idx]

        # Highlight active button
        for i, btn in enumerate(self._guide_section_btns):
            if i == idx:
                btn.configure(fg_color="#065f46", text_color="#ffffff")
            else:
                btn.configure(fg_color="transparent", text_color=TXT_DEFAULT)
        self._guide_plan_btn.configure(fg_color="transparent", text_color=TXT_DEFAULT)

        # Hide plan frame, show content labels
        self._guide_plan_frame.pack_forget()
        self._guide_content_title.pack(fill="x", padx=20, pady=(20, 2), anchor="w")
        self._guide_content_subtitle.pack(fill="x", padx=20, pady=(0, 12), anchor="w")
        self._guide_content_body.pack(fill="both", padx=20, pady=(0, 20), anchor="nw")

        self._guide_content_title.configure(text=sec["title"])
        self._guide_content_subtitle.configure(text=sec.get("subtitle", ""))
        self._guide_content_body.configure(text=sec["content"])

    def _show_guide_plan(self):
        plan = self._guide_data.get("study_plan", [])

        # Highlight plan button
        for btn in self._guide_section_btns:
            btn.configure(fg_color="transparent", text_color=TXT_DEFAULT)
        self._guide_plan_btn.configure(fg_color="#065f46", text_color="#ffffff")

        # Hide section labels, show plan frame
        self._guide_content_title.pack_forget()
        self._guide_content_subtitle.pack_forget()
        self._guide_content_body.pack_forget()

        # Clear and rebuild plan
        for w in self._guide_plan_frame.winfo_children():
            w.destroy()

        ctk.CTkLabel(
            self._guide_plan_frame, text="План за учење",
            font=ctk.CTkFont(size=18, weight="bold"),
            anchor="w"
        ).pack(fill="x", padx=20, pady=(20, 12), anchor="w")

        priority_colors = {
            "НАЈВИСОК": "#dc2626",
            "ВИСОК": "#ea580c",
            "СРЕДЕН": "#ca8a04",
            "ЗАВРШЕН": "#16a34a",
        }

        for item in plan:
            card = ctk.CTkFrame(self._guide_plan_frame, corner_radius=8)
            card.pack(fill="x", padx=20, pady=6)

            top_row = ctk.CTkFrame(card, fg_color="transparent")
            top_row.pack(fill="x", padx=14, pady=(10, 4))

            ctk.CTkLabel(
                top_row, text=f"{item['day']}: {item['title']}",
                font=ctk.CTkFont(size=14, weight="bold"), anchor="w"
            ).pack(side="left")

            prio_color = priority_colors.get(item.get("priority", ""), "#94a3b8")
            ctk.CTkLabel(
                top_row, text=item.get("priority", ""),
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=prio_color, anchor="e"
            ).pack(side="right")

            ctk.CTkLabel(
                card, text=item.get("reason", ""),
                font=ctk.CTkFont(size=11), text_color="#94a3b8",
                anchor="w"
            ).pack(fill="x", padx=14, pady=(0, 4))

            steps_text = "\n".join(f"  • {s}" for s in item.get("steps", []))
            ctk.CTkLabel(
                card, text=steps_text,
                font=ctk.CTkFont(size=12), justify="left", anchor="nw",
                wraplength=600
            ).pack(fill="x", padx=14, pady=(0, 10))

        self._guide_plan_frame.pack(fill="both", padx=0, pady=0)

    def _back_from_guide(self):
        if self._guide_back_target == "summary" and self._session_saved:
            self._show_summary()
        else:
            self._show_quiz()

    def _build_stat_card(self, parent, title):
        card = ctk.CTkFrame(parent)
        card.pack(side="left", expand=True, fill="x", padx=6)
        ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=11),
                     text_color="#94a3b8").pack(pady=(10, 2))
        value = ctk.CTkLabel(card, text="0", font=ctk.CTkFont(size=24, weight="bold"))
        value.pack(pady=(0, 10))
        return value

    # ── Screen switching ──────────────────────────────────────────────────────

    def _hide_frames(self):
        self.subjects_frame.pack_forget()
        self.quiz_frame.pack_forget()
        self.summary_frame.pack_forget()
        self.sessions_frame.pack_forget()
        self.tainted_frame.pack_forget()
        self.guide_frame.pack_forget()

    def _set_subject_paths(self, subject_name):
        self.subject_name = subject_name
        self.subject_dir = os.path.join(self.base_path, subject_name) if subject_name else None
        if not self.subject_dir:
            self.cards_path = ""
            self.sessions_path = ""
            self.wrong_cards_path = ""
            self.mastered_cards_path = ""
            self.mastery_progress_path = ""
            self.tainted_path = ""
            self.wrong_strikes_path = ""
            self.redemption_strikes_path = ""
            self._wrong_count = 0
            self._mastered_count = 0
            return

        self.cards_path = os.path.join(self.subject_dir, "cards.json")
        self.sessions_path = os.path.join(self.subject_dir, "sessions.json")
        self.wrong_cards_path = os.path.join(self.subject_dir, "wrong_cards.json")
        self.mastered_cards_path = os.path.join(self.subject_dir, "mastered_cards.json")
        self.mastery_progress_path = os.path.join(self.subject_dir, "mastery_progress.json")
        self.tainted_path = os.path.join(self.subject_dir, "tainted.json")
        self.wrong_strikes_path = os.path.join(self.subject_dir, "wrong_strikes.json")
        self.redemption_strikes_path = os.path.join(self.subject_dir, "redemption_strikes.json")
        if not load_sessions(self.sessions_path):
            clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
        self._reload_review_counts()

    def _available_subjects(self):
        subjects = []
        for name in sorted(os.listdir(self.base_path)):
            full_path = os.path.join(self.base_path, name)
            if not os.path.isdir(full_path) or name.startswith("."):
                continue
            if os.path.exists(os.path.join(full_path, "cards.json")):
                subjects.append(name)
        return subjects

    def _reset_all_progress(self):
        confirmed = ctk.CTkInputDialog(
            text="Ова ќе го избрише сиот напредок (сесии, грешки, совладани карти) за сите предмети.\nВнеси 'RESET' за да потврдиш:",
            title="Reset All Progress"
        ).get_input()
        if confirmed != "RESET":
            return
        progress_files = [
            "sessions.json", "wrong_cards.json",
            "mastered_cards.json", "mastery_progress.json", "tainted.json",
            "wrong_strikes.json", "redemption_strikes.json",
        ]
        for subject in self._available_subjects():
            subject_dir = os.path.join(self.base_path, subject)
            for fname in progress_files:
                fpath = os.path.join(subject_dir, fname)
                if os.path.exists(fpath):
                    os.remove(fpath)
        self._show_subjects()

    def _rename_subject(self, subject_name):
        new_name = ctk.CTkInputDialog(
            text=f"Внеси ново име за '{subject_name}':",
            title="Rename Subject"
        ).get_input()
        if not new_name or not new_name.strip() or new_name.strip() == subject_name:
            return
        new_name = new_name.strip()
        old_path = os.path.join(self.base_path, subject_name)
        new_path = os.path.join(self.base_path, new_name)
        if os.path.exists(new_path):
            ctk.CTkInputDialog(
                text=f"Папка '{new_name}' веќе постои. Избери друго име.",
                title="Грешка"
            ).get_input()
            return
        os.rename(old_path, new_path)
        self._show_subjects()

    def _refresh_subjects_ui(self):
        for widget in self.subjects_scroll.winfo_children():
            widget.destroy()

        subjects = self._available_subjects()
        if not subjects:
            ctk.CTkLabel(
                self.subjects_scroll,
                text="No subjects found.\nCreate a subject folder with cards.json to get started.",
                text_color="#94a3b8",
                justify="center",
            ).pack(pady=40)
            return

        for subject in subjects:
            subject_dir = os.path.join(self.base_path, subject)
            cards, _ = load_cards(os.path.join(subject_dir, "cards.json"))
            sessions = load_sessions(os.path.join(subject_dir, "sessions.json"))
            wrong_cards = load_wrong_cards(os.path.join(subject_dir, "wrong_cards.json"))
            mastered_cards = load_mastered_cards(os.path.join(subject_dir, "mastered_cards.json"))
            tainted_cards = tainted_question_set(os.path.join(subject_dir, "tainted.json"))

            card = ctk.CTkFrame(self.subjects_scroll)
            card.pack(fill="x", pady=8)

            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=16, pady=(14, 6))
            ctk.CTkLabel(
                top, text=subject, font=ctk.CTkFont(size=18, weight="bold")
            ).pack(side="left")
            ctk.CTkButton(
                top, text="Open", width=100,
                command=lambda subject_name=subject: self._choose_subject(subject_name)
            ).pack(side="right")
            ctk.CTkButton(
                top, text="Rename", width=80,
                fg_color="#334155", hover_color="#475569",
                command=lambda subject_name=subject: self._rename_subject(subject_name)
            ).pack(side="right", padx=(0, 6))

            meta = (
                f'{len(cards)} cards   {len(sessions)} sessions   '
                f'Wrong: {len(wrong_cards)}   '
                f'Mastered: {sum(1 for item in mastered_cards if item.get("mastered"))}   '
                f'Tainted: {len(tainted_cards)}'
            )
            ctk.CTkLabel(
                card, text=meta, text_color="#94a3b8"
            ).pack(anchor="w", padx=16, pady=(0, 14))

    def _show_subjects(self):
        self._close_new_session_dialog()
        self._last_screen = "subjects"
        self._refresh_subjects_ui()
        self._hide_frames()
        self.subjects_frame.pack(fill="both", expand=True)

    def _choose_subject(self, subject_name):
        self._set_subject_paths(subject_name)
        self._load_main_deck()
        self._show_sessions("home")

    def _start_main_session(self):
        self._load_main_deck()
        self._show_quiz()

    def _show_quiz(self):
        self._close_new_session_dialog()
        self._last_screen = "quiz"
        self._hide_frames()
        self.quiz_frame.pack(fill="both", expand=True)
        self._refresh_deck_buttons()
        self._update_quiz_ui()

    def _show_summary(self):
        self._save_session_if_needed()
        self._close_new_session_dialog()
        self._last_screen = "summary"
        self._hide_frames()

        for w in self.missed_scroll.winfo_children():
            w.destroy()

        missed_questions = [c["question"] for c in self._missed_cards]
        if missed_questions:
            self.missed_header.configure(text=f"MISSED ({len(missed_questions)})")
            for q in missed_questions:
                ctk.CTkLabel(self.missed_scroll, text=q, wraplength=500,
                             justify="left", anchor="w").pack(fill="x", pady=2)
        else:
            self.missed_header.configure(text="")
            ctk.CTkLabel(self.missed_scroll, text="Perfect score!",
                         text_color="#4ade80").pack()

        self._refresh_deck_buttons()
        self.summary_frame.pack(fill="both", expand=True)

    def _show_sessions(self, back_target=None):
        self._close_new_session_dialog()
        self._sessions_back_target = back_target or self._last_screen
        self._refresh_sessions_ui()
        self._hide_frames()
        self.sessions_frame.pack(fill="both", expand=True)

    def _back_from_sessions(self):
        if self._sessions_back_target == "summary" and self._session_saved:
            self._show_summary()
        elif self._sessions_back_target == "home":
            self._show_subjects()
        else:
            self._show_quiz()

    def _reload_review_counts(self):
        if not self.subject_name:
            self._wrong_count = 0
            self._mastered_count = 0
            return
        self._wrong_count = len(load_wrong_cards(self.wrong_cards_path))
        self._mastered_count = sum(
            1 for card in load_mastered_cards(self.mastered_cards_path)
            if card.get("mastered")
        )

    def _delete_session(self, index):
        delete_session_at(index, self.sessions_path)
        if not load_sessions(self.sessions_path):
            clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
        self._reload_review_counts()
        self._refresh_sessions_ui()

    # ── Quiz logic ────────────────────────────────────────────────────────────

    def _update_quiz_ui(self):
        self._answered = False
        self._selected = set()
        self._hide_feedback()
        self._refresh_deck_buttons()
        mode_text = MODE_LABELS.get(self._deck_mode, "Custom deck")
        if self.subject_name:
            mode_text = f"{self.subject_name} • {mode_text}"
        if self._deck_mode == "main" and self._mastered_hidden_count:
            mode_text += f" • {self._mastered_hidden_count} hidden from main"
        self.mode_label.configure(text=mode_text)

        for w in self.action_frame.winfo_children():
            w.pack_forget()

        if self._error:
            self.question_label.configure(text=self._error)
            for btn in self.choice_btns:
                btn.pack_forget()
            self.hint_label.configure(text="")
            return

        if not self.deck.total:
            self.question_label.configure(text=self._empty_message)
            for btn in self.choice_btns:
                btn.pack_forget()
            self.hint_label.configure(text="")
            return

        card = self.deck.current_card()
        self.counter_label.configure(
            text=f"Card {self.deck.current_position} of {self.deck.total}")
        self.progress.set(self.deck.current_position / self.deck.total)
        self.question_label.configure(text=card["question"])
        self._configure_question_layout()

        choices = card.get("choices", [])
        card_type = card.get("type", "single")
        self._ensure_choice_buttons(len(choices))

        for i, btn in enumerate(self.choice_btns):
            if i < len(choices):
                label = LETTERS[i] if i < len(LETTERS) else str(i + 1)
                btn.configure(
                    text=f"  {label})   {choices[i]}",
                    fg_color=CLR_DEFAULT, text_color=TXT_DEFAULT,
                    state="normal"
                )
                self._configure_choice_layout(btn)
                btn.pack(fill="x", pady=3)
            else:
                btn.pack_forget()

        hint = ("single choice — click an answer" if card_type == "single"
                else "multiple choice — select all that apply, then Submit")
        self.hint_label.configure(text=hint)

    def _select_choice(self, idx):
        if self._answered:
            return
        card = self.deck.current_card()
        card_type = card.get("type", "single")

        if card_type == "single":
            self._selected = {idx}
            self._judge()
        else:
            if idx in self._selected:
                self._selected.discard(idx)
                self.choice_btns[idx].configure(fg_color=CLR_DEFAULT)
            else:
                self._selected.add(idx)
                self.choice_btns[idx].configure(fg_color=CLR_SELECTED)

            for w in self.action_frame.winfo_children():
                w.pack_forget()
            if self._selected:
                self.submit_btn.pack()

    def _submit(self):
        if not self._answered and self._selected:
            self._judge()

    def _judge(self):
        self._answered = True
        card = self.deck.current_card()
        correct_set = set(card.get("correct", []))
        is_correct = self._selected == correct_set

        self.deck.mark(is_correct)
        if not is_correct:
            question = str(card.get("question", "")).strip()
            progress = {
                r.get("question"): int(r.get("streak", 0))
                for r in load_mastery_progress(self.mastered_cards_path, self.mastery_progress_path)
                if r.get("question")
            }
            if progress.get(question, 0) >= 1:
                self._streak_reset_questions.add(question)
            else:
                merge_wrong_cards([card], self.wrong_cards_path, tainted_path=None)
            redemption = load_redemption_strikes(self.redemption_strikes_path)
            if question in redemption:
                del redemption[question]
                save_redemption_strikes(redemption, self.redemption_strikes_path)
            strike_count = record_wrong_strike(question, self.wrong_strikes_path)
            if strike_count >= TAINTED_THRESHOLD:
                existing = load_tainted_questions(self.tainted_path)
                if question not in existing:
                    save_tainted_questions(existing + [question], self.tainted_path)
            self._delete_from_file(self.mastered_cards_path, question)
            self._delete_from_file(self.mastery_progress_path, question)
            self._reload_review_counts()
            self._refresh_deck_buttons()

        choices = card.get("choices", [])
        for i, btn in enumerate(self.choice_btns):
            if i >= len(choices):
                continue
            if i in correct_set:
                btn.configure(fg_color=CLR_CORRECT, text_color=TXT_CORRECT,
                              state="disabled")
            elif i in self._selected:
                btn.configure(fg_color=CLR_WRONG, text_color=TXT_WRONG,
                              state="disabled")
            else:
                btn.configure(fg_color=CLR_FADED, text_color=TXT_FADED,
                              state="disabled")

        for w in self.action_frame.winfo_children():
            w.pack_forget()
        self.next_btn.pack()
        self.hint_label.configure(text="")
        self._show_feedback(is_correct, card)

    def _next_card(self):
        if self.deck.current_position == self.deck.total:
            self._show_summary()
        else:
            self.deck.next()
            self._update_quiz_ui()

    def _finish_session(self):
        if self._error or not self.deck.total:
            return
        self._show_summary()

    def _restart_current_session(self):
        if self._error or not self.deck.total:
            return
        if self._deck_mode == "main":
            self._load_main_deck()
        elif self._deck_mode == "wrong_set":
            self._load_wrong_deck()
        elif self._deck_mode == "mastered":
            self._load_mastered_deck()
        else:
            self.deck.restart()
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self._show_quiz()

    def _retry_missed(self):
        if self._missed_cards:
            self.deck = DeckState(self._missed_cards)
            self._error = None
            self._empty_message = "No missed cards from the last session."
            self._deck_mode = "missed"
            if self.shuffle_var.get() and self.deck.total:
                self.deck.shuffle(True)
        else:
            self._load_main_deck()
        self._session_saved = False
        self._show_quiz()

    def _new_session(self):
        if not self.subject_name:
            self._show_subjects()
            return
        self._open_new_session_dialog()

    def _close_new_session_dialog(self):
        if self._new_session_dialog is None:
            return
        try:
            self._new_session_dialog.grab_release()
        except Exception:
            pass
        try:
            self._new_session_dialog.destroy()
        except Exception:
            pass
        self._new_session_dialog = None

    def _start_new_session_mode(self, mode):
        self._close_new_session_dialog()
        if mode == "wrong_set":
            self._load_wrong_deck()
        elif mode == "mastered":
            self._load_mastered_deck()
        else:
            self._load_main_deck()
        self._show_quiz()

    def _open_new_session_dialog(self):
        if self._new_session_dialog is not None:
            try:
                self._new_session_dialog.lift()
                self._new_session_dialog.focus()
                return
            except Exception:
                self._new_session_dialog = None

        dialog = ctk.CTkToplevel(self)
        dialog.title("Start New Session")
        dialog.geometry("420x260")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()
        dialog.protocol("WM_DELETE_WINDOW", self._close_new_session_dialog)
        self._new_session_dialog = dialog

        ctk.CTkLabel(
            dialog, text="Choose Session Type",
            font=ctk.CTkFont(size=22, weight="bold")
        ).pack(pady=(24, 6))
        ctk.CTkLabel(
            dialog,
            text=f"{self.subject_name} subject",
            font=ctk.CTkFont(size=12),
            text_color="#94a3b8",
        ).pack()
        ctk.CTkLabel(
            dialog,
            text="Wrong answers go to Wrong Set. After a Wrong Set session, only the correctly answered cards return to Main deck.",
            font=ctk.CTkFont(size=11),
            text_color="#94a3b8",
            wraplength=340,
            justify="center",
        ).pack(pady=(10, 18), padx=24)

        actions = ctk.CTkFrame(dialog, fg_color="transparent")
        actions.pack(fill="x", padx=24)
        ctk.CTkButton(
            actions, text="Normal Set", height=42,
            command=lambda: self._start_new_session_mode("main")
        ).pack(fill="x", pady=6)
        ctk.CTkButton(
            actions, text=f"Wrong Set ({self._wrong_count})", height=42,
            fg_color="#0f766e", hover_color="#115e59",
            command=lambda: self._start_new_session_mode("wrong_set")
        ).pack(fill="x", pady=6)
        ctk.CTkButton(
            actions, text=f"Mastered ({self._mastered_count})", height=42,
            fg_color="#1d4ed8", hover_color="#1e40af",
            command=lambda: self._start_new_session_mode("mastered")
        ).pack(fill="x", pady=6)

        ctk.CTkButton(
            dialog, text="Cancel", width=120,
            fg_color="#334155", hover_color="#475569",
            command=self._close_new_session_dialog
        ).pack(pady=(14, 18))

    def _delete_from_file(self, path, question):
        if not path or not os.path.exists(path):
            return 0
        try:
            with open(path, "r") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return 0

        if not isinstance(data, list):
            return 0

        if data and isinstance(data[0], str):
            remaining = [item for item in data if str(item).strip() != question]
            removed = len(data) - len(remaining)
            if removed:
                with open(path, "w") as f:
                    json.dump(remaining, f, ensure_ascii=False, indent=2)
            return removed

        remaining = [
            card for card in data
            if str(card.get("question", "")).strip() != question
        ]
        removed = len(data) - len(remaining)
        if removed:
            save_cards(remaining, path)
        return removed

    def _delete_current_question(self):
        if self._error or not self.deck.total:
            return

        card = self.deck.current_card()
        question = str(card.get("question", "")).strip()
        if not question:
            return

        self._delete_from_file(self.cards_path, question)
        self._delete_from_file(self.wrong_cards_path, question)
        self._delete_from_file(self.mastered_cards_path, question)
        self._delete_from_file(self.mastery_progress_path, question)
        self._delete_from_file(self.tainted_path, question)
        if self.wrong_strikes_path and os.path.exists(self.wrong_strikes_path):
            strikes = load_wrong_strikes(self.wrong_strikes_path)
            strikes.pop(question, None)
            save_wrong_strikes(strikes, self.wrong_strikes_path)
        self._reload_review_counts()
        self.deck.remove_question(question)
        self._missed_cards = [
            missed for missed in self._missed_cards
            if str(missed.get("question", "")).strip() != question
        ]

        if self._deck_mode == "main":
            all_cards, error = load_cards(self.cards_path)
            hidden_questions = (
                mastered_question_set(self.mastered_cards_path)
                | tainted_question_set(self.tainted_path)
            )
            visible_total = sum(
                1 for item in all_cards
                if item.get("question") not in hidden_questions
            )
            self._mastered_hidden_count = len(all_cards) - visible_total
            self._error = error

        if not self.deck.total:
            if self._deck_mode == "main":
                self._load_main_deck()
            elif self._deck_mode == "wrong_set":
                self._load_wrong_deck()
            elif self._deck_mode == "mastered":
                self._load_mastered_deck()
            else:
                self._empty_message = "No cards left in this session."

        self._session_saved = False
        self._show_quiz()

    def _toggle_shuffle(self):
        if self._error or not self.deck.total:
            return
        self.deck.shuffle(bool(self.shuffle_var.get()))
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self._show_quiz()

    def _load_main_deck(self):
        cards, error = load_cards(self.cards_path)
        hidden_questions = (
            mastered_question_set(self.mastered_cards_path)
            | tainted_question_set(self.tainted_path)
        )
        visible_cards = [card for card in cards if card.get("question") not in hidden_questions]
        self._mastered_hidden_count = len(cards) - len(visible_cards)
        self.deck = DeckState(visible_cards)
        self._error = error
        if cards and not visible_cards and not error:
            self._empty_message = (
                "Main deck is empty.\nAll questions have moved to Mastered or Wrong Set."
            )
        else:
            self._empty_message = "No cards found.\nAsk Claude to add some questions!"
        self._deck_mode = "main"
        if self.shuffle_var.get() and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _load_wrong_deck(self):
        cards = load_wrong_cards(self.wrong_cards_path)
        self.deck = DeckState(cards)
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = "Wrong Set is empty.\nYou have no pending missed questions."
        self._deck_mode = "wrong_set"
        if self.shuffle_var.get() and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _start_wrong_set(self):
        self._load_wrong_deck()
        self._show_quiz()

    def _load_mastered_deck(self):
        cards = [
            card for card in load_mastered_cards(self.mastered_cards_path)
            if card.get("mastered")
        ]
        self.deck = DeckState(cards)
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = (
            f"Mastered set is empty.\nNo questions have reached {MASTERED_THRESHOLD} correct sessions yet."
        )
        self._deck_mode = "mastered"
        if self.shuffle_var.get() and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _start_mastered_set(self):
        self._load_mastered_deck()
        self._show_quiz()

    def _reset_mastered_to_main(self):
        if not self.subject_name:
            self._show_subjects()
            return

        cards, error = load_cards(self.cards_path)
        if error:
            self._error = error
            self._show_quiz()
            return

        shuffled_cards = shuffle_card_bank(cards)
        save_cards(shuffled_cards, self.cards_path)

        wrong_cards = load_cards(self.wrong_cards_path)[0]
        if wrong_cards:
            save_cards(sync_cards_to_bank(shuffled_cards, wrong_cards), self.wrong_cards_path)

        clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
        self._reload_review_counts()
        self._load_main_deck()
        self._show_quiz()

    def _save_session_if_needed(self):
        correct, answered = self.deck.session_score()
        total = self.deck.total
        score_pct = round(correct / total * 100) if total else 0
        correct_cards = self.deck.correct_cards()
        self._missed_cards = self.deck.missed_cards()
        self.score_label.configure(text=f"{score_pct}%")
        self.score_sub_label.configure(
            text=f"{correct} correct out of {total} total questions"
        )

        if self._session_saved or self._error or not self.deck.total:
            return

        wrong_status = "Wrong Set unchanged"
        try:
            if self._deck_mode == "wrong_set":
                tainted = tainted_question_set(self.tainted_path)
                redemption = load_redemption_strikes(self.redemption_strikes_path)
                redeemed = []
                keep_in_wrong = set()
                for card in correct_cards:
                    q = str(card.get("question", "")).strip()
                    if q in tainted:
                        count = redemption.get(q, 0) + 1
                        redemption[q] = count
                        if count >= 2:
                            redeemed.append(card)
                            del redemption[q]
                        else:
                            keep_in_wrong.add(q)
                save_redemption_strikes(redemption, self.redemption_strikes_path)
                clearable = [c for c in correct_cards
                             if str(c.get("question", "")).strip() not in keep_in_wrong]
                clear_wrong_cards(clearable, self.wrong_cards_path)
                if redeemed:
                    clear_tainted_questions(redeemed, self.tainted_path)
                    strikes = load_wrong_strikes(self.wrong_strikes_path)
                    for card in redeemed:
                        strikes.pop(str(card.get("question", "")).strip(), None)
                    save_wrong_strikes(strikes, self.wrong_strikes_path)
                wrong_status = f"Returned {len(clearable)} cards to Main deck"
            else:
                wrong_set_cards = [
                    c for c in self._missed_cards
                    if str(c.get("question", "")).strip() not in self._streak_reset_questions
                ]
                merge_wrong_cards(wrong_set_cards, self.wrong_cards_path, tainted_path=None)
                wrong_status = f"Updated {self.wrong_cards_path}"
        except Exception as e:
            wrong_status = f"Could not update {self.wrong_cards_path}"
            print(f"Warning: could not update wrong card bank: {e}", file=sys.stderr)

        mastered_status = f"Skipped mastery update"
        if self._deck_mode == "main" and answered == total and total:
            mastered_status = f"Updated {self.mastered_cards_path}"
            try:
                update_mastered_cards(
                    correct_cards,
                    self._missed_cards,
                    self.mastered_cards_path,
                    self.mastery_progress_path,
                    tainted_path=self.tainted_path,
                )
            except Exception as e:
                mastered_status = f"Could not update {self.mastered_cards_path}"
                print(f"Warning: could not update mastered card bank: {e}", file=sys.stderr)

        session_saved = False
        try:
            save_session(
                score_pct, correct, total, self._missed_cards,
                self.sessions_path, deck_mode=self._deck_mode
            )
            session_saved = True
        except Exception as e:
            print(f"Warning: could not save session: {e}", file=sys.stderr)

        if session_saved:
            self.summary_hint_label.configure(
                text=f"Saved to {self.sessions_path} • {wrong_status} • {mastered_status}"
            )
        else:
            self.summary_hint_label.configure(
                text=f"Could not save {self.sessions_path} • {wrong_status} • {mastered_status}"
            )

        self._session_saved = session_saved
        self._reload_review_counts()
        self._refresh_deck_buttons()

    def _refresh_sessions_ui(self):
        sessions = load_sessions(self.sessions_path)
        wrong_cards = load_wrong_cards(self.wrong_cards_path)
        mastered_cards = load_mastered_cards(self.mastered_cards_path)
        summary = summarize_sessions(sessions)
        self.sessions_subject_label.configure(text=self.subject_name or "")
        self.sessions_count_label.configure(text=str(summary["count"]))
        self.sessions_avg_label.configure(text=f'{summary["average_score"]}%')
        self.sessions_best_label.configure(text=f'{summary["best_score"]}%')
        self.sessions_last_label.configure(text=f'{summary["last_score"]}%')
        self.sessions_wrong_label.configure(text=str(len(wrong_cards)))
        self.sessions_mastered_label.configure(text=str(len(mastered_cards)))
        wrong_state = "normal" if wrong_cards else "disabled"
        mastered_state = "normal" if any(c.get("mastered") for c in mastered_cards) else "disabled"
        self.home_wrong_btn.configure(state=wrong_state)
        self.home_mastered_btn.configure(state=mastered_state)
        self._refresh_deck_buttons()

        for w in self.sessions_scroll.winfo_children():
            w.destroy()

        if not sessions:
            ctk.CTkLabel(
                self.sessions_scroll,
                text="No saved sessions yet.\nFinish a quiz to start tracking them.",
                text_color="#94a3b8",
                justify="center",
            ).pack(pady=30)
            return

        for reverse_idx, session in enumerate(reversed(sessions)):
            session_index = len(sessions) - 1 - reverse_idx
            missed = session.get("missed", [])
            deck_mode = MODE_LABELS.get(session.get("deck_mode", "main"), "Main deck")
            card = ctk.CTkFrame(self.sessions_scroll)
            card.pack(fill="x", pady=6)
            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=12, pady=(10, 4))
            ctk.CTkLabel(top, text=session.get("date", "unknown"),
                         font=ctk.CTkFont(size=12, weight="bold")).pack(side="left")
            actions = ctk.CTkFrame(top, fg_color="transparent")
            actions.pack(side="right")
            ctk.CTkButton(
                actions, text="Delete", width=80,
                fg_color="#991b1b", hover_color="#b91c1c",
                command=lambda idx=session_index: self._delete_session(idx)
            ).pack(side="right", padx=(8, 0))
            ctk.CTkLabel(actions, text=f'{session.get("score_pct", 0)}%',
                         font=ctk.CTkFont(size=14, weight="bold"),
                         text_color="#7dd3fc").pack(side="right")

            meta = (
                f'Deck: {deck_mode}   Correct: {session.get("correct", 0)}/'
                f'{session.get("total", 0)}   Missed: {len(missed)}'
            )
            ctk.CTkLabel(card, text=meta, text_color="#94a3b8").pack(anchor="w", padx=12)

            if missed:
                ctk.CTkLabel(
                    card, text="Needs review", text_color="#f87171"
                ).pack(anchor="w", padx=12, pady=(4, 10))
            else:
                ctk.CTkLabel(card, text="Perfect score!", text_color="#4ade80").pack(
                    anchor="w", padx=12, pady=(4, 10)
                )

    def _hide_feedback(self):
        self.feedback_frame.pack_forget()
        self.result_label.configure(text="")
        self.explanation_label.configure(text="")

    def _show_feedback(self, is_correct, card):
        answer_parts = format_correct_choices(card)
        answer_text = "; ".join(answer_parts) if answer_parts else "Нема означен точен одговор."
        answer_prefix = "Точен одговор" if len(answer_parts) == 1 else "Точни одговори"
        verdict = "Точно" if is_correct else "Неточно"
        verdict_color = TXT_CORRECT if is_correct else TXT_WRONG
        self.result_label.configure(
            text=f"{verdict}. {answer_prefix}: {answer_text}",
            text_color=verdict_color,
        )
        self.explanation_label.configure(text=build_explanation(card))
        self.feedback_frame.pack(fill="x", padx=20, pady=(10, 0))

    def _choice_wraplength(self):
        width = self.winfo_width() or self.winfo_screenwidth()
        return max(320, min(width - 260, 1100))

    def _question_wraplength(self):
        width = self.winfo_width() or self.winfo_screenwidth()
        return max(360, min(width - 200, 1200))

    def _configure_question_layout(self):
        wraplength = self._question_wraplength()
        if wraplength == self._last_question_wraplength:
            return
        self._last_question_wraplength = wraplength
        self.question_label.configure(wraplength=wraplength)
        self.explanation_label.configure(wraplength=wraplength)

    def _configure_choice_layout(self, btn):
        text_label = getattr(btn, "_text_label", None)
        if text_label is None:
            return
        wraplength = self._choice_wraplength()
        text_label.configure(justify="left", anchor="w", wraplength=wraplength)
        chars_per_line = max(18, wraplength // 10)
        line_count = max(1, (len(btn.cget("text")) + chars_per_line - 1) // chars_per_line)
        btn.configure(height=max(44, 24 + line_count * 22))

    def _apply_responsive_layout(self):
        self._resize_after_id = None
        self._configure_question_layout()
        choice_wraplength = self._choice_wraplength()
        if choice_wraplength == self._last_choice_wraplength:
            return
        self._last_choice_wraplength = choice_wraplength
        for btn in self.choice_btns:
            if btn.winfo_manager():
                self._configure_choice_layout(btn)

    def _handle_resize(self, event=None):
        if event is not None and event.widget is not self:
            return
        if self._resize_after_id is not None:
            self.after_cancel(self._resize_after_id)
        self._resize_after_id = self.after(20, self._apply_responsive_layout)

    def _refresh_deck_buttons(self):
        button_groups = {
            f"Wrong Set ({self._wrong_count})": ("wrong_set_btn", "summary_wrong_btn", "sessions_wrong_btn"),
            f"Mastered ({self._mastered_count})": ("mastered_set_btn", "summary_mastered_btn", "sessions_mastered_btn"),
        }

        for text, names in button_groups.items():
            for btn_name in names:
                btn = getattr(self, btn_name, None)
                if btn is not None:
                    btn.configure(text=text)

    def _exit_fullscreen(self, _event=None):
        self.attributes("-fullscreen", False)


if __name__ == "__main__":
    app = FlashcardApp()
    app.mainloop()
