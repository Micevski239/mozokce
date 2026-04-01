import json
import os
import sys
from pathlib import Path

try:
    from PySide6.QtCore import Qt, Signal
    from PySide6.QtGui import QCursor, QFont
    from PySide6.QtWidgets import (
        QApplication,
        QCheckBox,
        QDialog,
        QDialogButtonBox,
        QFrame,
        QGridLayout,
        QHBoxLayout,
        QInputDialog,
        QLabel,
        QMainWindow,
        QMessageBox,
        QPushButton,
        QProgressBar,
        QScrollArea,
        QSizePolicy,
        QStackedWidget,
        QVBoxLayout,
        QWidget,
    )
except ModuleNotFoundError as exc:  # pragma: no cover - runtime only
    raise SystemExit(
        "PySide6 is not installed. Run `pip install -r requirements.txt` and start `python3 qt_app.py`."
    ) from exc

from deck import (
    DeckState,
    build_explanation,
    card_question_keys,
    format_correct_choices,
    get_card_source_meta,
    load_cards,
    save_cards,
    shuffle_card_bank,
    sync_cards_to_bank,
)
from sessions import (
    COMPLETED_THRESHOLD,
    MASTERED_THRESHOLD,
    TAINTED_THRESHOLD,
    clear_completed_state,
    clear_mastered_state,
    clear_tainted_questions,
    clear_wrong_cards,
    completed_question_set,
    delete_session_at,
    load_completed_cards,
    load_flagged_cards,
    load_mastered_cards,
    load_mastery_progress,
    load_redemption_strikes,
    load_sessions,
    load_tainted_questions,
    load_wrong_cards,
    load_wrong_strikes,
    mastered_question_set,
    merge_wrong_cards,
    record_wrong_strike,
    save_redemption_strikes,
    save_session,
    save_tainted_questions,
    save_wrong_strikes,
    summarize_sessions,
    tainted_question_set,
    toggle_flagged_card,
    update_completed_cards,
    update_mastered_cards,
)

APP_BG = "#08111f"
SIDEBAR_BG = "#0d172a"
PANEL_BG = "#101a2e"
CARD_BG = "#13203a"
CARD_ELEVATED = "#162541"
BORDER = "#24324d"
TEXT = "#ecf4ff"
TEXT_MUTED = "#90a3bf"
TEXT_SOFT = "#b7c6de"
PRIMARY = "#2563eb"
PRIMARY_HOVER = "#1d4ed8"
WRONG = "#f97316"
WRONG_HOVER = "#ea580c"
MASTERED = "#3b82f6"
MASTERED_HOVER = "#2563eb"
COMPLETED = "#22c55e"
COMPLETED_HOVER = "#16a34a"
FLAGGED = "#f59e0b"
FLAGGED_HOVER = "#d97706"
DANGER = "#ef4444"
DANGER_HOVER = "#dc2626"
SUCCESS = "#22c55e"
SUCCESS_BG = "#0d2619"
ERROR_BG = "#341018"
ERROR_TEXT = "#fca5a5"
SUCCESS_TEXT = "#86efac"
SELECTION_BG = "#142846"
FADED_BG = "#0d1526"

LETTERS = list("abcdefghijklmnopqrstuvwxyz")
MODE_LABELS = {
    "main": "Главен сет",
    "missed": "Пропуштени",
    "wrong_set": "Погрешни",
    "mastered": "Совладани",
    "completed": "Готови",
    "flagged": "Означени",
}
GUIDE_SECTIONS = [
    (
        "Предмети",
        "Избери предмет од левата листа.\n\nСекој предмет е своја папка со cards.json и свој локален прогрес.",
    ),
    (
        "Почетна",
        "Почетната страна прикажува статистики, историја на сесии и брз пристап до сетовите.\n\nГлавниот сет ги крие совладаните, готовите и tainted прашањата.",
    ),
    (
        "Квиз",
        "Кај single choice прашања, кликот веднаш одговара. Кај multiple choice, избери ги точните и притисни Поднеси.\n\nПогрешните одговори одат во Погрешни, а совладаните се движат низ streak логика.",
    ),
    (
        "Совладани и Готови",
        f"По {MASTERED_THRESHOLD} точни сесии во Главен сет, прашањето станува Совладано.\n\nПо {COMPLETED_THRESHOLD} точни сесии во Совладани, оди во Готови.",
    ),
    (
        "Tainted",
        f"По {TAINTED_THRESHOLD} вкупни погрешни одговори, прашањето станува tainted.\n\nСе деблокира со 2 точни по ред во Погрешни или со рачно чистење.",
    ),
]


def app_stylesheet():
    return f"""
    QMainWindow {{
        background: {APP_BG};
        color: {TEXT};
    }}
    QWidget {{
        background: transparent;
        color: {TEXT};
        font-family: "SF Pro Text", "Inter", "Segoe UI", sans-serif;
        font-size: 14px;
    }}
    QFrame#Sidebar {{
        background: {SIDEBAR_BG};
        border-right: 1px solid {BORDER};
    }}
    QFrame#Panel, QFrame#Card, QFrame#HeroCard, QFrame#SubjectCard, QFrame#SessionCard,
    QFrame#QuestionCard, QFrame#FeedbackCard, QFrame#BottomBar, QFrame#TopBar, QFrame#StatCard,
    QFrame#ToolsCard, QFrame#SetCard, QFrame#GuideCard, QFrame#TaintedCard {{
        background: {PANEL_BG};
        border: 1px solid {BORDER};
        border-radius: 18px;
    }}
    QLabel#BrandTitle {{
        font-size: 24px;
        font-weight: 700;
        color: {TEXT};
    }}
    QLabel#BrandSubtitle, QLabel#Muted, QLabel#Meta, QLabel#EmptyState {{
        color: {TEXT_MUTED};
    }}
    QLabel#PageTitle {{
        font-size: 28px;
        font-weight: 700;
        color: {TEXT};
    }}
    QLabel#SectionTitle {{
        font-size: 16px;
        font-weight: 600;
        color: {TEXT};
    }}
    QLabel#QuestionText {{
        font-size: 28px;
        font-weight: 600;
        color: {TEXT};
    }}
    QLabel#ScoreValue {{
        font-size: 64px;
        font-weight: 800;
        color: #7dd3fc;
    }}
    QLabel#StatValue {{
        font-size: 28px;
        font-weight: 700;
        color: {TEXT};
    }}
    QLabel#TinyLabel {{
        font-size: 11px;
        color: {TEXT_MUTED};
    }}
    QPushButton {{
        background: {CARD_BG};
        color: {TEXT};
        border: 1px solid {BORDER};
        border-radius: 14px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
    }}
    QPushButton:hover {{
        background: {CARD_ELEVATED};
        border-color: #35507e;
    }}
    QPushButton:disabled {{
        background: #101827;
        color: #5d6a85;
        border-color: #1b2538;
    }}
    QPushButton[role="primary"] {{
        background: {PRIMARY};
        border-color: {PRIMARY};
    }}
    QPushButton[role="primary"]:hover {{
        background: {PRIMARY_HOVER};
        border-color: {PRIMARY_HOVER};
    }}
    QPushButton[role="wrong"] {{
        background: {WRONG};
        border-color: {WRONG};
    }}
    QPushButton[role="wrong"]:hover {{
        background: {WRONG_HOVER};
        border-color: {WRONG_HOVER};
    }}
    QPushButton[role="mastered"] {{
        background: {MASTERED};
        border-color: {MASTERED};
    }}
    QPushButton[role="mastered"]:hover {{
        background: {MASTERED_HOVER};
        border-color: {MASTERED_HOVER};
    }}
    QPushButton[role="completed"] {{
        background: {COMPLETED};
        border-color: {COMPLETED};
    }}
    QPushButton[role="completed"]:hover {{
        background: {COMPLETED_HOVER};
        border-color: {COMPLETED_HOVER};
    }}
    QPushButton[role="flagged"] {{
        background: {FLAGGED};
        border-color: {FLAGGED};
        color: #1a1203;
    }}
    QPushButton[role="flagged"]:hover {{
        background: {FLAGGED_HOVER};
        border-color: {FLAGGED_HOVER};
        color: #1a1203;
    }}
    QPushButton[role="danger"] {{
        background: transparent;
        color: #fca5a5;
        border-color: #7f1d1d;
    }}
    QPushButton[role="danger"]:hover {{
        background: #2a1117;
        border-color: #b91c1c;
    }}
    QPushButton[role="ghost"] {{
        background: transparent;
    }}
    QPushButton[role="nav"] {{
        background: transparent;
        color: {TEXT_MUTED};
        border: 1px solid transparent;
        text-align: left;
        padding: 12px 14px;
    }}
    QPushButton[role="nav"]:hover {{
        background: {CARD_BG};
        border-color: {BORDER};
        color: {TEXT};
    }}
    QPushButton[role="nav"][active="true"] {{
        background: {CARD_BG};
        border-color: {BORDER};
        color: {TEXT};
    }}
    QPushButton[role="icon"] {{
        min-width: 42px;
        max-width: 42px;
        min-height: 42px;
        max-height: 42px;
        padding: 0px;
        font-size: 18px;
        background: transparent;
    }}
    QPushButton[role="icon"]:hover {{
        background: {CARD_BG};
    }}
    QCheckBox {{
        color: {TEXT_MUTED};
        spacing: 8px;
        font-size: 13px;
    }}
    QScrollArea {{
        border: none;
        background: transparent;
    }}
    QProgressBar {{
        background: {FADED_BG};
        border: 1px solid {BORDER};
        border-radius: 8px;
        min-height: 12px;
        max-height: 12px;
    }}
    QProgressBar::chunk {{
        background: {PRIMARY};
        border-radius: 7px;
    }}
    """


def set_button_role(button, role):
    button.setProperty("role", role)
    refresh_widget_style(button)


def set_nav_active(button, active):
    button.setProperty("active", "true" if active else "false")
    refresh_widget_style(button)


def refresh_widget_style(widget):
    widget.style().unpolish(widget)
    widget.style().polish(widget)
    widget.update()


def clear_layout(layout):
    while layout.count():
        item = layout.takeAt(0)
        widget = item.widget()
        child_layout = item.layout()
        if widget is not None:
            widget.deleteLater()
        elif child_layout is not None:
            clear_layout(child_layout)


def make_scroll_area():
    scroll = QScrollArea()
    scroll.setWidgetResizable(True)
    scroll.setFrameShape(QFrame.NoFrame)
    content = QWidget()
    layout = QVBoxLayout(content)
    layout.setContentsMargins(0, 0, 0, 0)
    layout.setSpacing(16)
    scroll.setWidget(content)
    return scroll, content, layout


def make_chip(text, bg, fg=TEXT, radius=10):
    label = QLabel(text)
    label.setObjectName("Meta")
    label.setStyleSheet(
        f"background:{bg}; color:{fg}; border:1px solid {bg}; border-radius:{radius}px; padding:6px 10px;"
    )
    return label


def make_card(name="Card"):
    frame = QFrame()
    frame.setObjectName(name)
    return frame


def make_label(text="", object_name=None, word_wrap=False):
    label = QLabel(text)
    if object_name:
        label.setObjectName(object_name)
    label.setWordWrap(word_wrap)
    return label


class TinyIconAction(QWidget):
    clicked = Signal()

    def __init__(self, icon_text, label_text, color):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(2)
        self.button = QPushButton(icon_text)
        set_button_role(self.button, "icon")
        self.button.setStyleSheet(
            self.button.styleSheet() + f"QPushButton{{color:{color};}}"
        )
        self.button.clicked.connect(self.clicked.emit)
        self.button.setCursor(QCursor(Qt.PointingHandCursor))
        layout.addWidget(self.button, alignment=Qt.AlignHCenter)
        caption = make_label(label_text, "TinyLabel")
        caption.setAlignment(Qt.AlignCenter)
        layout.addWidget(caption)

    def setEnabled(self, enabled):
        self.button.setEnabled(enabled)
        super().setEnabled(enabled)

    def set_icon_color(self, color):
        self.button.setStyleSheet(
            f"QPushButton{{color:{color}; background:transparent; border:1px solid transparent; border-radius:14px; min-width:42px; max-width:42px; min-height:42px; max-height:42px; font-size:18px;}}"
            f"QPushButton:hover{{background:{CARD_BG}; border-color:{BORDER};}}"
            f"QPushButton:disabled{{color:#5d6a85; background:transparent; border-color:transparent;}}"
        )


class AnswerOption(QFrame):
    clicked = Signal(int)

    def __init__(self, index):
        super().__init__()
        self.index = index
        self._locked = False
        self.setObjectName("AnswerOption")
        self.setCursor(QCursor(Qt.PointingHandCursor))
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(12)

        self.badge = QLabel()
        self.badge.setFixedWidth(28)
        self.badge.setAlignment(Qt.AlignCenter)
        self.badge.setStyleSheet(
            f"background:{FADED_BG}; color:{TEXT_SOFT}; border:1px solid {BORDER}; border-radius:10px; padding:4px 0px; font-weight:700;"
        )
        layout.addWidget(self.badge, alignment=Qt.AlignTop)

        self.text_label = QLabel()
        self.text_label.setWordWrap(True)
        self.text_label.setStyleSheet(f"color:{TEXT}; font-size:15px;")
        layout.addWidget(self.text_label, 1)

        self.set_choice_state("default")

    def configure(self, letter, text):
        self.badge.setText(letter.upper())
        self.text_label.setText(text)

    def set_choice_state(self, state):
        mapping = {
            "default": (PANEL_BG, BORDER, TEXT, FADED_BG, TEXT_SOFT),
            "selected": (SELECTION_BG, PRIMARY, TEXT, "#173766", "#bfdbfe"),
            "correct": (SUCCESS_BG, SUCCESS, SUCCESS_TEXT, "#144d2c", "#d1fae5"),
            "wrong": (ERROR_BG, DANGER, ERROR_TEXT, "#4f1822", "#fecaca"),
            "faded": (FADED_BG, BORDER, TEXT_MUTED, "#101827", "#7b8ba9"),
        }
        bg, border, text, badge_bg, badge_text = mapping[state]
        self.setStyleSheet(
            f"QFrame#AnswerOption{{background:{bg}; border:1px solid {border}; border-radius:18px;}}"
        )
        self.text_label.setStyleSheet(f"color:{text}; font-size:15px;")
        self.badge.setStyleSheet(
            f"background:{badge_bg}; color:{badge_text}; border:1px solid {border}; border-radius:10px; padding:4px 0px; font-weight:700;"
        )
        refresh_widget_style(self)

    def set_locked(self, locked):
        self._locked = locked
        self.setCursor(QCursor(Qt.ArrowCursor if locked else Qt.PointingHandCursor))

    def mousePressEvent(self, event):
        if not self._locked and event.button() == Qt.LeftButton:
            self.clicked.emit(self.index)
        super().mousePressEvent(event)


class SessionPickerDialog(QDialog):
    def __init__(self, subject_name, counts, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Нова сесија")
        self.setModal(True)
        self.selected_mode = None
        self.resize(420, 340)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        title = make_label("Избери тип на сесија", "PageTitle")
        title.setStyleSheet(f"color:{TEXT}; font-size:24px; font-weight:700;")
        layout.addWidget(title)

        subject = make_label(f"Предмет: {subject_name}", "Muted")
        layout.addWidget(subject)

        note = make_label(
            "Погрешните одговори одат во Погрешни. По Погрешна сесија, само точно одговорените картички се враќаат во Главен сет.",
            "Muted",
            word_wrap=True,
        )
        layout.addWidget(note)

        buttons = [
            ("main", "Нормален сет", "primary"),
            ("wrong_set", f"Погрешни ({counts['wrong']})", "wrong"),
            ("flagged", f"Означени ({counts['flagged']})", "flagged"),
            ("mastered", f"Совладани ({counts['mastered']})", "mastered"),
            ("completed", f"Готови ({counts['completed']})", "completed"),
        ]
        for mode, text, role in buttons:
            btn = QPushButton(text)
            set_button_role(btn, role)
            btn.clicked.connect(lambda _checked=False, selected=mode: self._select(selected))
            layout.addWidget(btn)

        button_box = QDialogButtonBox(QDialogButtonBox.Cancel)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _select(self, mode):
        self.selected_mode = mode
        self.accept()


class FlashcardQtApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Mozokce")
        self.resize(1520, 940)
        self.setMinimumSize(1200, 760)

        self.base_path = os.path.dirname(os.path.abspath(__file__))
        subjects_dir = os.path.join(self.base_path, "subjects")
        self.subjects_base_path = subjects_dir if os.path.isdir(subjects_dir) else self.base_path
        self.subject_name = None
        self.subject_dir = None
        self.cards_path = ""
        self.sessions_path = ""
        self.wrong_cards_path = ""
        self.flagged_cards_path = ""
        self.mastered_cards_path = ""
        self.mastery_progress_path = ""
        self.completed_cards_path = ""
        self.completed_progress_path = ""
        self.tainted_path = ""
        self.wrong_strikes_path = ""
        self.redemption_strikes_path = ""
        self.shuffle_enabled = False

        self.deck = DeckState([])
        self._error = None
        self._empty_message = "Нема карти."
        self._deck_mode = "main"
        self._mastered_hidden_count = 0
        self._selected = set()
        self._answered = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self._session_saved = False
        self._last_screen = "subjects"
        self._wrong_count = 0
        self._mastered_count = 0
        self._completed_count = 0
        self._flagged_count = 0
        self._main_session_state = None

        root = QWidget()
        root.setObjectName("Root")
        self.setCentralWidget(root)
        root_layout = QHBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        self.sidebar = self._build_sidebar()
        root_layout.addWidget(self.sidebar)

        self.stack = QStackedWidget()
        root_layout.addWidget(self.stack, 1)

        self._build_subjects_page()
        self._build_dashboard_page()
        self._build_quiz_page()
        self._build_summary_page()
        self._build_tainted_page()
        self._build_guide_page()

        self.setStyleSheet(app_stylesheet())
        self._refresh_sidebar()
        self.show_subjects()

    # ── UI Building ──────────────────────────────────────────────────────

    def _build_sidebar(self):
        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(250)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        brand = QFrame()
        brand_layout = QVBoxLayout(brand)
        brand_layout.setContentsMargins(0, 0, 0, 0)
        brand_layout.setSpacing(4)
        brand_layout.addWidget(make_label("Mozokce", "BrandTitle"))
        brand_layout.addWidget(make_label("Desktop study cockpit", "BrandSubtitle"))
        layout.addWidget(brand)

        self.sidebar_subject_chip = make_chip("Без предмет", CARD_BG, TEXT_SOFT)
        layout.addWidget(self.sidebar_subject_chip)

        self.nav_buttons = {}
        for key, title in [
            ("subjects", "Предмети"),
            ("dashboard", "Почетна"),
            ("quiz", "Квиз"),
            ("tainted", "Tainted"),
            ("guide", "Водич"),
        ]:
            btn = QPushButton(title)
            set_button_role(btn, "nav")
            btn.clicked.connect(lambda _checked=False, target=key: self._navigate(target))
            layout.addWidget(btn)
            self.nav_buttons[key] = btn

        self.sidebar_stats = make_card("Card")
        stats_layout = QVBoxLayout(self.sidebar_stats)
        stats_layout.setContentsMargins(14, 14, 14, 14)
        stats_layout.setSpacing(8)
        stats_layout.addWidget(make_label("Состојба", "SectionTitle"))
        self.sidebar_stats_label = make_label("", "Muted", word_wrap=True)
        stats_layout.addWidget(self.sidebar_stats_label)
        layout.addWidget(self.sidebar_stats)

        layout.addStretch(1)
        footer = make_label(
            "Qt редизајн со иста логика за cards, sessions и review set-ови.",
            "Muted",
            word_wrap=True,
        )
        layout.addWidget(footer)
        return sidebar

    def _build_content_shell(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(18)
        return page, layout

    def _build_subjects_page(self):
        page, layout = self._build_content_shell()
        layout.addWidget(make_label("Предмети", "PageTitle"))
        layout.addWidget(
            make_label(
                "Избери предмет и продолжи таму каде што застана. Секој предмет има свој сет, свои сесии и сопствен review flow.",
                "Muted",
                word_wrap=True,
            )
        )
        self.subjects_scroll, _content, self.subjects_list_layout = make_scroll_area()
        layout.addWidget(self.subjects_scroll, 1)

        actions = QHBoxLayout()
        actions.addStretch(1)
        self.reset_all_btn = QPushButton("Ресетирај го сиот напредок")
        set_button_role(self.reset_all_btn, "danger")
        self.reset_all_btn.clicked.connect(self._reset_all_progress)
        actions.addWidget(self.reset_all_btn)
        layout.addLayout(actions)

        self.subjects_page = page
        self.stack.addWidget(page)

    def _build_stat_card(self, title):
        card = make_card("StatCard")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(4)
        label = make_label(title, "TinyLabel")
        value = make_label("0", "StatValue")
        layout.addWidget(label)
        layout.addWidget(value)
        return card, value

    def _build_dashboard_page(self):
        page, layout = self._build_content_shell()
        self.dashboard_hero = make_card("HeroCard")
        hero_layout = QVBoxLayout(self.dashboard_hero)
        hero_layout.setContentsMargins(20, 20, 20, 20)
        hero_layout.setSpacing(8)
        self.dashboard_subject_title = make_label("Без предмет", "PageTitle")
        self.dashboard_subject_subtitle = make_label(
            "Избери предмет за да се вчитаат статистики и сетови.",
            "Muted",
            word_wrap=True,
        )
        hero_layout.addWidget(self.dashboard_subject_title)
        hero_layout.addWidget(self.dashboard_subject_subtitle)
        layout.addWidget(self.dashboard_hero)

        self.dashboard_sets_card = make_card("SetCard")
        sets_layout = QVBoxLayout(self.dashboard_sets_card)
        sets_layout.setContentsMargins(18, 18, 18, 18)
        sets_layout.setSpacing(12)
        sets_layout.addWidget(make_label("Започни сесија", "SectionTitle"))
        row = QHBoxLayout()
        row.setSpacing(10)
        self.dashboard_main_btn = QPushButton("Главен сет")
        set_button_role(self.dashboard_main_btn, "primary")
        self.dashboard_main_btn.clicked.connect(self.start_main_session)
        row.addWidget(self.dashboard_main_btn)
        self.home_wrong_btn = QPushButton("Погрешни")
        set_button_role(self.home_wrong_btn, "wrong")
        self.home_wrong_btn.clicked.connect(self.start_wrong_set)
        row.addWidget(self.home_wrong_btn)
        self.home_mastered_btn = QPushButton("Совладани")
        set_button_role(self.home_mastered_btn, "mastered")
        self.home_mastered_btn.clicked.connect(self.start_mastered_set)
        row.addWidget(self.home_mastered_btn)
        self.home_completed_btn = QPushButton("Готови")
        set_button_role(self.home_completed_btn, "completed")
        self.home_completed_btn.clicked.connect(self.start_completed_set)
        row.addWidget(self.home_completed_btn)
        self.home_flagged_btn = QPushButton("Означени")
        set_button_role(self.home_flagged_btn, "flagged")
        self.home_flagged_btn.clicked.connect(self.start_flagged_set)
        row.addWidget(self.home_flagged_btn)
        sets_layout.addLayout(row)
        layout.addWidget(self.dashboard_sets_card)

        stats_grid = QGridLayout()
        stats_grid.setHorizontalSpacing(12)
        stats_grid.setVerticalSpacing(12)
        self.sessions_count_card, self.sessions_count_label = self._build_stat_card("Сесии")
        self.sessions_avg_card, self.sessions_avg_label = self._build_stat_card("Просек")
        self.sessions_best_card, self.sessions_best_label = self._build_stat_card("Најдобро")
        self.sessions_last_card, self.sessions_last_label = self._build_stat_card("Последно")
        self.sessions_wrong_card, self.sessions_wrong_label = self._build_stat_card("Погрешни")
        self.sessions_mastered_card, self.sessions_mastered_label = self._build_stat_card("Совладани")
        self.sessions_completed_card, self.sessions_completed_label = self._build_stat_card("Готови")
        stat_cards = [
            self.sessions_count_card,
            self.sessions_avg_card,
            self.sessions_best_card,
            self.sessions_last_card,
            self.sessions_wrong_card,
            self.sessions_mastered_card,
            self.sessions_completed_card,
        ]
        for idx, card in enumerate(stat_cards):
            stats_grid.addWidget(card, idx // 4, idx % 4)
        layout.addLayout(stats_grid)

        self.dashboard_sessions_scroll, _content, self.dashboard_sessions_layout = make_scroll_area()
        layout.addWidget(make_label("Историја на сесии", "SectionTitle"))
        layout.addWidget(self.dashboard_sessions_scroll, 1)

        self.dashboard_tools_card = make_card("ToolsCard")
        tools_layout = QHBoxLayout(self.dashboard_tools_card)
        tools_layout.setContentsMargins(18, 18, 18, 18)
        tools_layout.setSpacing(10)
        self.reset_mastered_btn = QPushButton("Ресетирај совладани")
        set_button_role(self.reset_mastered_btn, "ghost")
        self.reset_mastered_btn.clicked.connect(self._reset_mastered_to_main)
        tools_layout.addWidget(self.reset_mastered_btn)
        tainted_btn = QPushButton("Tainted")
        set_button_role(tainted_btn, "ghost")
        tainted_btn.clicked.connect(self.show_tainted)
        tools_layout.addWidget(tainted_btn)
        subjects_btn = QPushButton("Предмети")
        set_button_role(subjects_btn, "ghost")
        subjects_btn.clicked.connect(self.show_subjects)
        tools_layout.addWidget(subjects_btn)
        tools_layout.addStretch(1)
        layout.addWidget(self.dashboard_tools_card)

        self.dashboard_page = page
        self.stack.addWidget(page)

    def _build_quiz_page(self):
        page, layout = self._build_content_shell()

        top_bar = make_card("TopBar")
        top_layout = QVBoxLayout(top_bar)
        top_layout.setContentsMargins(18, 18, 18, 18)
        top_layout.setSpacing(12)

        row1 = QHBoxLayout()
        row1.setSpacing(12)
        title_block = QVBoxLayout()
        title_block.setSpacing(4)
        title_block.addWidget(make_label("Учи со картички", "PageTitle"))
        meta_row = QHBoxLayout()
        self.quiz_mode_chip = make_chip("Главен сет", CARD_BG, TEXT_SOFT)
        meta_row.addWidget(self.quiz_mode_chip)
        self.counter_label = make_label("", "Muted")
        meta_row.addWidget(self.counter_label)
        meta_row.addStretch(1)
        title_block.addLayout(meta_row)
        row1.addLayout(title_block, 1)

        utility = QHBoxLayout()
        utility.setSpacing(8)
        self.subjects_nav_btn = QPushButton("Предмети")
        set_button_role(self.subjects_nav_btn, "ghost")
        self.subjects_nav_btn.clicked.connect(self.show_subjects)
        utility.addWidget(self.subjects_nav_btn)
        self.home_nav_btn = QPushButton("Почетна")
        set_button_role(self.home_nav_btn, "ghost")
        self.home_nav_btn.clicked.connect(self.show_dashboard)
        utility.addWidget(self.home_nav_btn)
        self.guide_nav_btn = QPushButton("Водич")
        set_button_role(self.guide_nav_btn, "ghost")
        self.guide_nav_btn.clicked.connect(self.show_guide)
        utility.addWidget(self.guide_nav_btn)
        self.shuffle_checkbox = QCheckBox("Измешај")
        self.shuffle_checkbox.toggled.connect(self._toggle_shuffle)
        utility.addWidget(self.shuffle_checkbox)
        self.flag_action = TinyIconAction("🚩", "Ознака", FLAGGED)
        self.flag_action.clicked.connect(self._toggle_current_flag)
        utility.addWidget(self.flag_action)
        self.delete_action = TinyIconAction("🗑", "Избриши", "#f87171")
        self.delete_action.clicked.connect(self._delete_current_question)
        utility.addWidget(self.delete_action)
        self.finish_action = TinyIconAction("⏹", "Заврши", TEXT_SOFT)
        self.finish_action.clicked.connect(self._finish_session)
        utility.addWidget(self.finish_action)
        row1.addLayout(utility)
        top_layout.addLayout(row1)

        row2 = QHBoxLayout()
        row2.setSpacing(10)
        self.back_to_main_btn = QPushButton("Главен сет")
        set_button_role(self.back_to_main_btn, "ghost")
        self.back_to_main_btn.clicked.connect(self._return_to_main_set)
        row2.addWidget(self.back_to_main_btn)
        row2.addStretch(1)
        self.new_session_btn = QPushButton("Нова сесија")
        set_button_role(self.new_session_btn, "primary")
        self.new_session_btn.clicked.connect(self._new_session)
        row2.addWidget(self.new_session_btn)
        self.restart_session_btn = QPushButton("Почни одново")
        set_button_role(self.restart_session_btn, "ghost")
        self.restart_session_btn.clicked.connect(self._restart_current_session)
        row2.addWidget(self.restart_session_btn)
        top_layout.addLayout(row2)

        layout.addWidget(top_bar)

        self.progress = QProgressBar()
        self.progress.setTextVisible(False)
        self.progress.setRange(0, 100)
        layout.addWidget(self.progress)

        self.quiz_scroll, _content, quiz_body = make_scroll_area()

        self.question_card = make_card("QuestionCard")
        question_layout = QVBoxLayout(self.question_card)
        question_layout.setContentsMargins(24, 24, 24, 24)
        question_layout.setSpacing(14)
        self.question_source_container = QHBoxLayout()
        self.question_source_container.addStretch(1)
        self.question_source_chip = make_chip("", CARD_BG)
        self.question_source_chip.hide()
        self.question_source_container.addWidget(self.question_source_chip)
        question_layout.addLayout(self.question_source_container)
        self.question_label = make_label("", "QuestionText", word_wrap=True)
        self.question_label.setAlignment(Qt.AlignCenter)
        question_layout.addWidget(self.question_label)
        quiz_body.addWidget(self.question_card)

        self.choices_frame = QWidget()
        self.choices_layout = QVBoxLayout(self.choices_frame)
        self.choices_layout.setContentsMargins(0, 0, 0, 0)
        self.choices_layout.setSpacing(10)
        quiz_body.addWidget(self.choices_frame)

        self.hint_label = make_label("", "Muted", word_wrap=True)
        self.hint_label.setAlignment(Qt.AlignCenter)
        quiz_body.addWidget(self.hint_label)

        self.action_bar = QWidget()
        action_layout = QHBoxLayout(self.action_bar)
        action_layout.setContentsMargins(0, 0, 0, 0)
        action_layout.setSpacing(10)
        action_layout.addStretch(1)
        self.submit_btn = QPushButton("Поднеси")
        set_button_role(self.submit_btn, "primary")
        self.submit_btn.clicked.connect(self._submit)
        action_layout.addWidget(self.submit_btn)
        self.next_btn = QPushButton("Следен")
        set_button_role(self.next_btn, "primary")
        self.next_btn.clicked.connect(self._next_card)
        action_layout.addWidget(self.next_btn)
        action_layout.addStretch(1)
        quiz_body.addWidget(self.action_bar)

        self.feedback_card = make_card("FeedbackCard")
        feedback_layout = QVBoxLayout(self.feedback_card)
        feedback_layout.setContentsMargins(18, 18, 18, 18)
        feedback_layout.setSpacing(8)
        self.result_label = make_label("", None, word_wrap=True)
        self.result_label.setStyleSheet("font-size:18px; font-weight:700;")
        feedback_layout.addWidget(self.result_label)
        self.explanation_label = make_label("", "Muted", word_wrap=True)
        feedback_layout.addWidget(self.explanation_label)
        quiz_body.addWidget(self.feedback_card)
        self.feedback_card.hide()

        quiz_body.addStretch(1)
        layout.addWidget(self.quiz_scroll, 1)

        self.bottom_decks_bar = make_card("BottomBar")
        bottom_layout = QHBoxLayout(self.bottom_decks_bar)
        bottom_layout.setContentsMargins(18, 14, 18, 14)
        bottom_layout.setSpacing(10)
        bottom_layout.addStretch(1)
        self.wrong_set_btn = QPushButton("Погрешни")
        set_button_role(self.wrong_set_btn, "wrong")
        self.wrong_set_btn.clicked.connect(self.start_wrong_set)
        bottom_layout.addWidget(self.wrong_set_btn)
        self.mastered_set_btn = QPushButton("Совладани")
        set_button_role(self.mastered_set_btn, "mastered")
        self.mastered_set_btn.clicked.connect(self.start_mastered_set)
        bottom_layout.addWidget(self.mastered_set_btn)
        self.completed_set_btn = QPushButton("Готови")
        set_button_role(self.completed_set_btn, "completed")
        self.completed_set_btn.clicked.connect(self.start_completed_set)
        bottom_layout.addWidget(self.completed_set_btn)
        self.flagged_set_btn = QPushButton("Означени")
        set_button_role(self.flagged_set_btn, "flagged")
        self.flagged_set_btn.clicked.connect(self.start_flagged_set)
        bottom_layout.addWidget(self.flagged_set_btn)
        bottom_layout.addStretch(1)
        layout.addWidget(self.bottom_decks_bar)

        self.quiz_page = page
        self.stack.addWidget(page)

    def _build_summary_page(self):
        page, layout = self._build_content_shell()
        layout.addWidget(make_label("Сесијата е завршена", "PageTitle"))
        self.summary_hint_label = make_label("", "Muted", word_wrap=True)
        layout.addWidget(self.summary_hint_label)

        score_card = make_card("HeroCard")
        score_layout = QVBoxLayout(score_card)
        score_layout.setContentsMargins(24, 24, 24, 24)
        score_layout.setSpacing(8)
        self.score_label = make_label("0%", "ScoreValue")
        self.score_label.setAlignment(Qt.AlignCenter)
        score_layout.addWidget(self.score_label)
        self.score_sub_label = make_label("", "Muted", word_wrap=True)
        self.score_sub_label.setAlignment(Qt.AlignCenter)
        score_layout.addWidget(self.score_sub_label)
        layout.addWidget(score_card)

        layout.addWidget(make_label("Пропуштени прашања", "SectionTitle"))
        self.summary_missed_scroll, _content, self.summary_missed_layout = make_scroll_area()
        layout.addWidget(self.summary_missed_scroll, 1)

        actions = QHBoxLayout()
        actions.setSpacing(10)
        actions.addStretch(1)
        self.retry_missed_btn = QPushButton("Повтори пропуштени")
        set_button_role(self.retry_missed_btn, "ghost")
        self.retry_missed_btn.clicked.connect(self._retry_missed)
        actions.addWidget(self.retry_missed_btn)
        self.summary_wrong_btn = QPushButton("Погрешни")
        set_button_role(self.summary_wrong_btn, "wrong")
        self.summary_wrong_btn.clicked.connect(self.start_wrong_set)
        actions.addWidget(self.summary_wrong_btn)
        self.summary_mastered_btn = QPushButton("Совладани")
        set_button_role(self.summary_mastered_btn, "mastered")
        self.summary_mastered_btn.clicked.connect(self.start_mastered_set)
        actions.addWidget(self.summary_mastered_btn)
        self.summary_completed_btn = QPushButton("Готови")
        set_button_role(self.summary_completed_btn, "completed")
        self.summary_completed_btn.clicked.connect(self.start_completed_set)
        actions.addWidget(self.summary_completed_btn)
        self.summary_flagged_btn = QPushButton("Означени")
        set_button_role(self.summary_flagged_btn, "flagged")
        self.summary_flagged_btn.clicked.connect(self.start_flagged_set)
        actions.addWidget(self.summary_flagged_btn)
        self.summary_home_btn = QPushButton("Почетна")
        set_button_role(self.summary_home_btn, "primary")
        self.summary_home_btn.clicked.connect(self.show_dashboard)
        actions.addWidget(self.summary_home_btn)
        actions.addStretch(1)
        layout.addLayout(actions)

        self.summary_page = page
        self.stack.addWidget(page)

    def _build_tainted_page(self):
        page, layout = self._build_content_shell()
        layout.addWidget(make_label("Tainted прашања", "PageTitle"))
        layout.addWidget(
            make_label(
                "Прашања со повеќекратни погрешни обиди. Овде можеш рачно да ги деблокираш.",
                "Muted",
                word_wrap=True,
            )
        )
        self.tainted_count_label = make_label("", "Muted")
        layout.addWidget(self.tainted_count_label)
        self.tainted_scroll, _content, self.tainted_layout = make_scroll_area()
        layout.addWidget(self.tainted_scroll, 1)
        row = QHBoxLayout()
        row.addStretch(1)
        self.clear_tainted_btn = QPushButton("Исчисти ги сите Tainted")
        set_button_role(self.clear_tainted_btn, "danger")
        self.clear_tainted_btn.clicked.connect(self._clear_all_tainted)
        row.addWidget(self.clear_tainted_btn)
        self.tainted_back_btn = QPushButton("Назад")
        set_button_role(self.tainted_back_btn, "ghost")
        self.tainted_back_btn.clicked.connect(self.show_dashboard)
        row.addWidget(self.tainted_back_btn)
        layout.addLayout(row)
        self.tainted_page = page
        self.stack.addWidget(page)

    def _build_guide_page(self):
        page, layout = self._build_content_shell()
        layout.addWidget(make_label("Водич", "PageTitle"))
        layout.addWidget(
            make_label(
                "Краток водич за flow-от на апликацијата и значењето на сетовите.",
                "Muted",
                word_wrap=True,
            )
        )
        scroll, _content, guide_layout = make_scroll_area()
        for title, body in GUIDE_SECTIONS:
            card = make_card("GuideCard")
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(18, 18, 18, 18)
            card_layout.setSpacing(8)
            card_layout.addWidget(make_label(title, "SectionTitle"))
            card_layout.addWidget(make_label(body, "Muted", word_wrap=True))
            guide_layout.addWidget(card)
        guide_layout.addStretch(1)
        layout.addWidget(scroll, 1)
        self.guide_page = page
        self.stack.addWidget(page)

    # ── Navigation ───────────────────────────────────────────────────────

    def _navigate(self, target):
        if target == "subjects":
            self.show_subjects()
        elif target == "dashboard":
            self.show_dashboard()
        elif target == "quiz":
            self.show_quiz()
        elif target == "tainted":
            self.show_tainted()
        elif target == "guide":
            self.show_guide()

    def _set_active_page(self, page_name):
        pages = {
            "subjects": self.subjects_page,
            "dashboard": self.dashboard_page,
            "quiz": self.quiz_page,
            "summary": self.summary_page,
            "tainted": self.tainted_page,
            "guide": self.guide_page,
        }
        self.stack.setCurrentWidget(pages[page_name])
        self._last_screen = page_name
        for key, button in self.nav_buttons.items():
            set_nav_active(button, key == page_name)

    def _refresh_sidebar(self):
        subject = self.subject_name or "Без предмет"
        self.sidebar_subject_chip.setText(subject)
        if self.subject_name:
            summary = (
                f"Погрешни: {self._wrong_count}\n"
                f"Совладани: {self._mastered_count}\n"
                f"Готови: {self._completed_count}\n"
                f"Означени: {self._flagged_count}"
            )
        else:
            summary = "Избери предмет за да се прикаже состојбата."
        self.sidebar_stats_label.setText(summary)
        enabled = bool(self.subject_name)
        for key in ("dashboard", "quiz", "tainted"):
            self.nav_buttons[key].setEnabled(enabled)

    # ── Data / subjects ─────────────────────────────────────────────────

    def _set_subject_paths(self, subject_name):
        self.subject_name = subject_name
        self.subject_dir = (
            os.path.join(self.subjects_base_path, subject_name) if subject_name else None
        )
        if not self.subject_dir:
            self.cards_path = ""
            self.sessions_path = ""
            self.wrong_cards_path = ""
            self.flagged_cards_path = ""
            self.mastered_cards_path = ""
            self.mastery_progress_path = ""
            self.completed_cards_path = ""
            self.completed_progress_path = ""
            self.tainted_path = ""
            self.wrong_strikes_path = ""
            self.redemption_strikes_path = ""
            self._wrong_count = 0
            self._mastered_count = 0
            self._completed_count = 0
            self._flagged_count = 0
            return

        self.cards_path = os.path.join(self.subject_dir, "cards.json")
        self.sessions_path = os.path.join(self.subject_dir, "sessions.json")
        self.wrong_cards_path = os.path.join(self.subject_dir, "wrong_cards.json")
        self.flagged_cards_path = os.path.join(self.subject_dir, "flagged_cards.json")
        self.mastered_cards_path = os.path.join(self.subject_dir, "mastered_cards.json")
        self.mastery_progress_path = os.path.join(self.subject_dir, "mastery_progress.json")
        self.completed_cards_path = os.path.join(self.subject_dir, "completed_cards.json")
        self.completed_progress_path = os.path.join(self.subject_dir, "completed_progress.json")
        self.tainted_path = os.path.join(self.subject_dir, "tainted.json")
        self.wrong_strikes_path = os.path.join(self.subject_dir, "wrong_strikes.json")
        self.redemption_strikes_path = os.path.join(self.subject_dir, "redemption_strikes.json")
        if not load_sessions(self.sessions_path):
            clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
            clear_completed_state(self.completed_cards_path, self.completed_progress_path)
        self._reload_review_counts()

    def _available_subjects(self):
        subjects = []
        for name in sorted(os.listdir(self.subjects_base_path)):
            full_path = os.path.join(self.subjects_base_path, name)
            if not os.path.isdir(full_path) or name.startswith("."):
                continue
            if os.path.exists(os.path.join(full_path, "cards.json")):
                subjects.append(name)
        return subjects

    def _reload_review_counts(self):
        if not self.subject_name:
            self._wrong_count = 0
            self._mastered_count = 0
            self._completed_count = 0
            self._flagged_count = 0
            self._refresh_sidebar()
            return
        self._wrong_count = len(load_wrong_cards(self.wrong_cards_path))
        self._mastered_count = sum(
            1 for card in load_mastered_cards(self.mastered_cards_path) if card.get("mastered")
        )
        self._completed_count = len(load_completed_cards(self.completed_cards_path))
        self._flagged_count = len(load_flagged_cards(self.flagged_cards_path))
        self._refresh_sidebar()

    def _refresh_subjects_page(self):
        clear_layout(self.subjects_list_layout)
        subjects = self._available_subjects()
        if not subjects:
            self.subjects_list_layout.addWidget(
                make_label(
                    "Нема најдени предмети.\nСоздај папка со cards.json во subjects/ за да започнеш.",
                    "EmptyState",
                    word_wrap=True,
                )
            )
            self.subjects_list_layout.addStretch(1)
            return

        for subject in subjects:
            subject_dir = os.path.join(self.subjects_base_path, subject)
            cards, _error = load_cards(os.path.join(subject_dir, "cards.json"))
            sessions = load_sessions(os.path.join(subject_dir, "sessions.json"))
            wrong_cards = load_wrong_cards(os.path.join(subject_dir, "wrong_cards.json"))
            flagged_cards = load_flagged_cards(os.path.join(subject_dir, "flagged_cards.json"))
            mastered_cards = load_mastered_cards(os.path.join(subject_dir, "mastered_cards.json"))
            completed_cards = load_completed_cards(os.path.join(subject_dir, "completed_cards.json"))
            tainted_cards = tainted_question_set(os.path.join(subject_dir, "tainted.json"))

            card = make_card("SubjectCard")
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(18, 18, 18, 18)
            card_layout.setSpacing(12)

            top = QHBoxLayout()
            title = make_label(subject, "SectionTitle")
            title.setStyleSheet("font-size:20px; font-weight:700;")
            top.addWidget(title)
            top.addStretch(1)
            rename_btn = QPushButton("Преименувај")
            set_button_role(rename_btn, "ghost")
            rename_btn.clicked.connect(lambda _checked=False, name=subject: self._rename_subject(name))
            top.addWidget(rename_btn)
            open_btn = QPushButton("Отвори")
            set_button_role(open_btn, "primary")
            open_btn.clicked.connect(lambda _checked=False, name=subject: self._choose_subject(name))
            top.addWidget(open_btn)
            card_layout.addLayout(top)

            meta = (
                f"{len(cards)} карти   {len(sessions)} сесии   "
                f"Погрешни: {len(wrong_cards)}   "
                f"Означени: {len(flagged_cards)}   "
                f"Совладани: {sum(1 for item in mastered_cards if item.get('mastered'))}   "
                f"Готови: {len(completed_cards)}   "
                f"Tainted: {len(tainted_cards)}"
            )
            card_layout.addWidget(make_label(meta, "Muted", word_wrap=True))
            self.subjects_list_layout.addWidget(card)

        self.subjects_list_layout.addStretch(1)

    def show_subjects(self):
        self._refresh_subjects_page()
        self._refresh_sidebar()
        self._set_active_page("subjects")

    def _choose_subject(self, subject_name):
        self._set_subject_paths(subject_name)
        self._load_main_deck()
        self.show_dashboard()

    def _rename_subject(self, subject_name):
        new_name, ok = QInputDialog.getText(self, "Преименувај предмет", f"Ново име за '{subject_name}':")
        new_name = new_name.strip() if ok and new_name else ""
        if not new_name or new_name == subject_name:
            return
        old_path = os.path.join(self.subjects_base_path, subject_name)
        new_path = os.path.join(self.subjects_base_path, new_name)
        if os.path.exists(new_path):
            QMessageBox.warning(self, "Грешка", f"Папката '{new_name}' веќе постои.")
            return
        os.rename(old_path, new_path)
        if self.subject_name == subject_name:
            self._set_subject_paths(new_name)
        self._refresh_subjects_page()
        self._refresh_dashboard()

    def _reset_all_progress(self):
        confirm, ok = QInputDialog.getText(
            self,
            "Ресетирај напредок",
            "Ова ќе го избрише целиот прогрес за сите предмети.\nВнеси 'РЕСЕТ' за да потврдиш:",
        )
        if not ok or confirm != "РЕСЕТ":
            return
        progress_files = [
            "sessions.json",
            "wrong_cards.json",
            "mastered_cards.json",
            "mastery_progress.json",
            "tainted.json",
            "completed_cards.json",
            "completed_progress.json",
            "wrong_strikes.json",
            "redemption_strikes.json",
            "flagged_cards.json",
        ]
        for subject in self._available_subjects():
            subject_dir = os.path.join(self.subjects_base_path, subject)
            for fname in progress_files:
                path = os.path.join(subject_dir, fname)
                if os.path.exists(path):
                    os.remove(path)
        if self.subject_name:
            self._set_subject_paths(self.subject_name)
            self._load_main_deck()
        self._refresh_subjects_page()
        self._refresh_dashboard()
        QMessageBox.information(self, "Готово", "Напредокот е ресетиран.")

    # ── Dashboard / sessions ────────────────────────────────────────────

    def _refresh_dashboard(self):
        self.dashboard_subject_title.setText(self.subject_name or "Без предмет")
        if not self.subject_name:
            self.dashboard_subject_subtitle.setText("Избери предмет за да ги вчиташ сетовите и историјата.")
            for label in (
                self.sessions_count_label,
                self.sessions_avg_label,
                self.sessions_best_label,
                self.sessions_last_label,
                self.sessions_wrong_label,
                self.sessions_mastered_label,
                self.sessions_completed_label,
            ):
                label.setText("0")
            clear_layout(self.dashboard_sessions_layout)
            self.dashboard_sessions_layout.addWidget(make_label("Нема избран предмет.", "EmptyState"))
            self.dashboard_sessions_layout.addStretch(1)
            self._refresh_deck_buttons()
            return

        sessions = load_sessions(self.sessions_path)
        wrong_cards = load_wrong_cards(self.wrong_cards_path)
        flagged_cards = load_flagged_cards(self.flagged_cards_path)
        mastered_cards = load_mastered_cards(self.mastered_cards_path)
        completed_cards = load_completed_cards(self.completed_cards_path)
        summary = summarize_sessions(sessions)

        self.dashboard_subject_subtitle.setText(
            "Сите review set-ови и сесии за овој предмет се локално зачувани во неговата папка."
        )
        self.sessions_count_label.setText(str(summary["count"]))
        self.sessions_avg_label.setText(f"{summary['average_score']}%")
        self.sessions_best_label.setText(f"{summary['best_score']}%")
        self.sessions_last_label.setText(f"{summary['last_score']}%")
        self.sessions_wrong_label.setText(str(len(wrong_cards)))
        self.sessions_mastered_label.setText(str(len(mastered_cards)))
        self.sessions_completed_label.setText(str(len(completed_cards)))

        clear_layout(self.dashboard_sessions_layout)
        if not sessions:
            self.dashboard_sessions_layout.addWidget(
                make_label("Нема зачувани сесии. Заврши квиз за да се појават тука.", "EmptyState")
            )
        else:
            for reverse_idx, session in enumerate(reversed(sessions)):
                session_index = len(sessions) - 1 - reverse_idx
                missed = session.get("missed", [])
                deck_mode = MODE_LABELS.get(session.get("deck_mode", "main"), "Главен сет")
                card = make_card("SessionCard")
                card_layout = QVBoxLayout(card)
                card_layout.setContentsMargins(16, 16, 16, 16)
                card_layout.setSpacing(8)

                top = QHBoxLayout()
                top.addWidget(make_label(session.get("date", "unknown"), "SectionTitle"))
                top.addStretch(1)
                score = make_label(f"{session.get('score_pct', 0)}%", None)
                score.setStyleSheet("font-size:18px; font-weight:700; color:#7dd3fc;")
                top.addWidget(score)
                delete_btn = QPushButton("🗑")
                set_button_role(delete_btn, "danger")
                delete_btn.setMaximumWidth(44)
                delete_btn.clicked.connect(lambda _checked=False, idx=session_index: self._delete_session(idx))
                top.addWidget(delete_btn)
                card_layout.addLayout(top)

                meta = (
                    f"Шпил: {deck_mode}   Точни: {session.get('correct', 0)}/{session.get('total', 0)}   "
                    f"Пропуштени: {len(missed)}"
                )
                card_layout.addWidget(make_label(meta, "Muted", word_wrap=True))
                if missed:
                    status = make_label("Треба повторување", None)
                    status.setStyleSheet(f"color:{ERROR_TEXT}; font-weight:600;")
                else:
                    status = make_label("Совршен резултат!", None)
                    status.setStyleSheet(f"color:{SUCCESS_TEXT}; font-weight:600;")
                card_layout.addWidget(status)
                self.dashboard_sessions_layout.addWidget(card)

        self.dashboard_sessions_layout.addStretch(1)
        wrong_state = len(wrong_cards) > 0
        flagged_state = len(flagged_cards) > 0
        mastered_state = any(card.get("mastered") for card in mastered_cards)
        completed_state = len(completed_cards) > 0
        self.home_wrong_btn.setEnabled(wrong_state)
        self.home_flagged_btn.setEnabled(flagged_state)
        self.home_mastered_btn.setEnabled(mastered_state)
        self.home_completed_btn.setEnabled(completed_state)
        self._refresh_deck_buttons()

    def show_dashboard(self):
        self._refresh_dashboard()
        self._set_active_page("dashboard")

    def _delete_session(self, index):
        if not self.subject_name:
            return
        delete_session_at(index, self.sessions_path)
        if not load_sessions(self.sessions_path):
            clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
            clear_completed_state(self.completed_cards_path, self.completed_progress_path)
        self._reload_review_counts()
        self._refresh_dashboard()

    # ── Quiz ─────────────────────────────────────────────────────────────

    def show_quiz(self):
        self._update_quiz_ui()
        self._set_active_page("quiz")

    def start_main_session(self):
        if not self._restore_main_session_state():
            self._load_main_deck()
        self.show_quiz()

    def _return_to_main_set(self):
        self.start_main_session()

    def _hide_feedback(self):
        self.feedback_card.hide()
        self.result_label.setText("")
        self.explanation_label.setText("")

    def _set_source_chip(self, card):
        meta = get_card_source_meta(card)
        if not meta:
            self.question_source_chip.hide()
            return
        self.question_source_chip.setText(meta["label"])
        self.question_source_chip.setStyleSheet(
            f"background:{meta['fg_color']}; color:{meta['text_color']}; border:1px solid {meta['fg_color']}; border-radius:10px; padding:6px 10px;"
        )
        self.question_source_chip.show()

    def _update_quiz_ui(self):
        self._answered = False
        self._selected = set()
        self._hide_feedback()
        self._refresh_deck_buttons()
        mode_text = MODE_LABELS.get(self._deck_mode, "Прилагодено шпил")
        if self.subject_name:
            mode_text = f"{self.subject_name} • {mode_text}"
        if self._deck_mode == "main" and self._mastered_hidden_count:
            mode_text += f" • {self._mastered_hidden_count} скриени"
        self.quiz_mode_chip.setText(mode_text)
        self.back_to_main_btn.setEnabled(self._deck_mode != "main")
        self.submit_btn.hide()
        self.next_btn.hide()

        clear_layout(self.choices_layout)
        self.answer_options = []

        if self._error:
            self.question_label.setText(self._error)
            self.question_source_chip.hide()
            self.counter_label.setText("")
            self.progress.setValue(0)
            self.flag_action.setEnabled(False)
            self.delete_action.setEnabled(False)
            self.hint_label.setText("")
            return

        if not self.deck.total:
            self.question_label.setText(self._empty_message)
            self.question_source_chip.hide()
            self.counter_label.setText("")
            self.progress.setValue(0)
            self.flag_action.setEnabled(False)
            self.delete_action.setEnabled(False)
            self.hint_label.setText("")
            return

        card = self.deck.current_card()
        self.counter_label.setText(f"Картичка {self.deck.current_position} од {self.deck.total}")
        progress_pct = round((self.deck.current_position / self.deck.total) * 100)
        self.progress.setValue(progress_pct)
        self.question_label.setText(card["question"])
        self._set_source_chip(card)
        self._update_current_flag_button(card)
        self.flag_action.setEnabled(True)
        self.delete_action.setEnabled(True)

        choices = card.get("choices", [])
        for i, choice in enumerate(choices):
            option = AnswerOption(i)
            label = LETTERS[i] if i < len(LETTERS) else str(i + 1)
            option.configure(label, choice)
            option.clicked.connect(self._select_choice)
            self.choices_layout.addWidget(option)
            self.answer_options.append(option)

        card_type = card.get("type", "single")
        if card_type == "single":
            hint = "Еден избор. Кликот веднаш одговара."
        else:
            hint = "Повеќе избори. Избери ги сите точни и потоа притисни Поднеси."
        self.hint_label.setText(hint)

    def _select_choice(self, idx):
        if self._answered:
            return
        card = self.deck.current_card()
        if card.get("type", "single") == "single":
            self._selected = {idx}
            self._update_answer_selection_states()
            self._judge()
            return

        if idx in self._selected:
            self._selected.remove(idx)
        else:
            self._selected.add(idx)
        self._update_answer_selection_states()
        self.submit_btn.setVisible(bool(self._selected))

    def _update_answer_selection_states(self):
        for option in self.answer_options:
            if option.index in self._selected:
                option.set_choice_state("selected")
            else:
                option.set_choice_state("default")

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
                record.get("question"): int(record.get("streak", 0))
                for record in load_mastery_progress(self.mastered_cards_path, self.mastery_progress_path)
                if record.get("question")
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

        for option in self.answer_options:
            option.set_locked(True)
            if option.index in correct_set:
                option.set_choice_state("correct")
            elif option.index in self._selected:
                option.set_choice_state("wrong")
            else:
                option.set_choice_state("faded")

        self.submit_btn.hide()
        self.next_btn.show()
        self.hint_label.setText("")
        self._show_feedback(is_correct, card)

    def _show_feedback(self, is_correct, card):
        answer_parts = format_correct_choices(card)
        answer_text = "; ".join(answer_parts) if answer_parts else "Нема означен точен одговор."
        answer_prefix = "Точен одговор" if len(answer_parts) == 1 else "Точни одговори"
        verdict = "Точно" if is_correct else "Неточно"
        verdict_color = SUCCESS_TEXT if is_correct else ERROR_TEXT
        self.result_label.setText(f"{verdict}. {answer_prefix}: {answer_text}")
        self.result_label.setStyleSheet(f"font-size:18px; font-weight:700; color:{verdict_color};")
        self.explanation_label.setText(build_explanation(card))
        self.feedback_card.show()

    def _next_card(self):
        if self.deck.current_position == self.deck.total:
            self.show_summary()
        else:
            self.deck.next()
            self._update_quiz_ui()

    def _finish_session(self):
        if self._error or not self.deck.total:
            return
        self.show_summary()

    def _restart_current_session(self):
        if self._error or not self.deck.total:
            return
        if self._deck_mode == "main":
            self._load_main_deck()
        elif self._deck_mode == "wrong_set":
            self._load_wrong_deck()
        elif self._deck_mode == "flagged":
            self._load_flagged_deck()
        elif self._deck_mode == "mastered":
            self._load_mastered_deck()
        elif self._deck_mode == "completed":
            self._load_completed_deck()
        else:
            self.deck.restart()
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self.show_quiz()

    def _retry_missed(self):
        if self._missed_cards:
            self.deck = DeckState(self._missed_cards)
            self._error = None
            self._empty_message = "Нема пропуштени карти од последната сесија."
            self._deck_mode = "missed"
            if self.shuffle_enabled and self.deck.total:
                self.deck.shuffle(True)
        else:
            self._load_main_deck()
        self._session_saved = False
        self.show_quiz()

    def _new_session(self):
        if not self.subject_name:
            self.show_subjects()
            return
        dialog = SessionPickerDialog(
            self.subject_name,
            {
                "wrong": self._wrong_count,
                "flagged": self._flagged_count,
                "mastered": self._mastered_count,
                "completed": self._completed_count,
            },
            self,
        )
        if dialog.exec() == QDialog.Accepted and dialog.selected_mode:
            self._start_new_session_mode(dialog.selected_mode)

    def _start_new_session_mode(self, mode):
        if mode == "wrong_set":
            self._capture_main_session_state()
            self._load_wrong_deck()
        elif mode == "flagged":
            self._capture_main_session_state()
            self._load_flagged_deck()
        elif mode == "mastered":
            self._capture_main_session_state()
            self._load_mastered_deck()
        elif mode == "completed":
            self._capture_main_session_state()
            self._load_completed_deck()
        else:
            self._main_session_state = None
            self._load_main_deck()
        self.show_quiz()

    # ── Deck loaders ────────────────────────────────────────────────────

    def _load_main_deck(self):
        cards, error = load_cards(self.cards_path)
        hidden_questions = (
            mastered_question_set(self.mastered_cards_path)
            | completed_question_set(self.completed_cards_path)
            | tainted_question_set(self.tainted_path)
        )
        visible_cards = [
            card for card in cards if not any(key in hidden_questions for key in card_question_keys(card))
        ]
        self._mastered_hidden_count = len(cards) - len(visible_cards)
        self.deck = DeckState(visible_cards)
        self._error = error
        if cards and not visible_cards and not error:
            self._empty_message = "Главното шпил е празно.\nСите прашања се преселени во Совладани, Погрешни или Готови."
        else:
            self._empty_message = "Нема карти."
        self._deck_mode = "main"
        if self.shuffle_enabled and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self._main_session_state = None

    def _load_wrong_deck(self):
        self.deck = DeckState(load_wrong_cards(self.wrong_cards_path))
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = "Погрешните се празни."
        self._deck_mode = "wrong_set"
        if self.shuffle_enabled and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _load_flagged_deck(self):
        self.deck = DeckState(load_flagged_cards(self.flagged_cards_path))
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = "Означените се празни."
        self._deck_mode = "flagged"
        if self.shuffle_enabled and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _load_mastered_deck(self):
        cards = [
            card
            for card in load_mastered_cards(self.mastered_cards_path)
            if card.get("mastered")
            and str(card.get("question", "")).strip() not in completed_question_set(self.completed_cards_path)
        ]
        self.deck = DeckState(cards)
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = (
            f"Совладаните се празни.\nНема прашања кои достигнале {MASTERED_THRESHOLD} точни сесии."
        )
        self._deck_mode = "mastered"
        if self.shuffle_enabled and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def _load_completed_deck(self):
        self.deck = DeckState(list(load_completed_cards(self.completed_cards_path)))
        self._error = None
        self._mastered_hidden_count = 0
        self._empty_message = (
            f"Готовите се празни.\nНема прашања што достигнале {COMPLETED_THRESHOLD} точни сесии во Совладани."
        )
        self._deck_mode = "completed"
        if self.shuffle_enabled and self.deck.total:
            self.deck.shuffle(True)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()

    def start_wrong_set(self):
        self._capture_main_session_state()
        self._load_wrong_deck()
        self.show_quiz()

    def start_flagged_set(self):
        self._capture_main_session_state()
        self._load_flagged_deck()
        self.show_quiz()

    def start_mastered_set(self):
        self._capture_main_session_state()
        self._load_mastered_deck()
        self.show_quiz()

    def start_completed_set(self):
        self._capture_main_session_state()
        self._load_completed_deck()
        self.show_quiz()

    def _capture_main_session_state(self):
        if self._deck_mode != "main" or self._error or not self.deck.total:
            return
        order_questions = []
        for original_index in self.deck.order:
            card = self.deck.original[original_index]
            order_questions.append(str(card.get("question", "")).strip())
        current_question = str(self.deck.current_card().get("question", "")).strip()
        results_by_question = {}
        for order_pos, is_correct in self.deck._results.items():
            if 0 <= order_pos < len(self.deck.order):
                original_index = self.deck.order[order_pos]
                question = str(self.deck.original[original_index].get("question", "")).strip()
                if question:
                    results_by_question[question] = bool(is_correct)
        self._main_session_state = {
            "order_questions": order_questions,
            "current_question": current_question,
            "results_by_question": results_by_question,
        }

    def _restore_main_session_state(self):
        state = self._main_session_state
        if not state:
            return False
        cards, error = load_cards(self.cards_path)
        if error:
            return False
        hidden_questions = (
            mastered_question_set(self.mastered_cards_path)
            | completed_question_set(self.completed_cards_path)
            | tainted_question_set(self.tainted_path)
        )
        visible_cards = [card for card in cards if card.get("question") not in hidden_questions]
        self._mastered_hidden_count = len(cards) - len(visible_cards)
        self._error = None
        if not visible_cards:
            self.deck = DeckState([])
            self._deck_mode = "main"
            self._session_saved = False
            self._missed_cards = []
            self._streak_reset_questions = set()
            self._main_session_state = None
            return True
        by_question = {}
        for card in visible_cards:
            question = str(card.get("question", "")).strip()
            if question and question not in by_question:
                by_question[question] = card
        ordered_cards = []
        used = set()
        for question in state.get("order_questions", []):
            card = by_question.get(question)
            if card is None or question in used:
                continue
            ordered_cards.append(card)
            used.add(question)
        for card in visible_cards:
            question = str(card.get("question", "")).strip()
            if question in used:
                continue
            ordered_cards.append(card)
            used.add(question)
        self.deck = DeckState(ordered_cards)
        self._deck_mode = "main"
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        current_question = state.get("current_question", "")
        if current_question:
            for idx, card in enumerate(self.deck.original):
                if str(card.get("question", "")).strip() == current_question:
                    self.deck.index = idx
                    break
        results_by_question = state.get("results_by_question", {})
        restored_results = {}
        for idx, card in enumerate(self.deck.original):
            question = str(card.get("question", "")).strip()
            if question in results_by_question:
                restored_results[idx] = bool(results_by_question[question])
        self.deck._results = restored_results
        return True

    def _toggle_shuffle(self, checked):
        self.shuffle_enabled = bool(checked)
        if self._error or not self.deck.total:
            return
        self._main_session_state = None
        self.deck.shuffle(self.shuffle_enabled)
        self._session_saved = False
        self._missed_cards = []
        self._streak_reset_questions = set()
        self.show_quiz()

    # ── Mutations ───────────────────────────────────────────────────────

    def _delete_from_file(self, path, question):
        if not path or not os.path.exists(path):
            return 0
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (FileNotFoundError, json.JSONDecodeError):
            return 0

        if not isinstance(data, list):
            return 0
        if data and isinstance(data[0], str):
            remaining = [item for item in data if str(item).strip() != question]
            removed = len(data) - len(remaining)
            if removed:
                with open(path, "w", encoding="utf-8") as handle:
                    json.dump(remaining, handle, ensure_ascii=False, indent=2)
            return removed

        remaining = [
            card for card in data if str(card.get("question", "")).strip() != question
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
        if QMessageBox.question(
            self,
            "Избриши прашање",
            "Ова ќе го тргне прашањето од subject банката и сите set фајлови. Продолжи?",
        ) != QMessageBox.Yes:
            return

        self._delete_from_file(self.cards_path, question)
        self._delete_from_file(self.wrong_cards_path, question)
        self._delete_from_file(self.flagged_cards_path, question)
        self._delete_from_file(self.mastered_cards_path, question)
        self._delete_from_file(self.mastery_progress_path, question)
        self._delete_from_file(self.completed_cards_path, question)
        self._delete_from_file(self.completed_progress_path, question)
        self._delete_from_file(self.tainted_path, question)
        if self.wrong_strikes_path and os.path.exists(self.wrong_strikes_path):
            strikes = load_wrong_strikes(self.wrong_strikes_path)
            strikes.pop(question, None)
            save_wrong_strikes(strikes, self.wrong_strikes_path)
        self._reload_review_counts()
        self._main_session_state = None
        self.deck.remove_question(question)
        self._missed_cards = [
            missed for missed in self._missed_cards if str(missed.get("question", "")).strip() != question
        ]
        if not self.deck.total:
            if self._deck_mode == "main":
                self._load_main_deck()
            elif self._deck_mode == "wrong_set":
                self._load_wrong_deck()
            elif self._deck_mode == "flagged":
                self._load_flagged_deck()
            elif self._deck_mode == "mastered":
                self._load_mastered_deck()
            elif self._deck_mode == "completed":
                self._load_completed_deck()
            else:
                self._empty_message = "Нема повеќе картички во оваа сесија."
        self._session_saved = False
        self._refresh_subjects_page()
        self._refresh_dashboard()
        self.show_quiz()

    def _flagged_question_set(self):
        return {
            str(card.get("question", "")).strip()
            for card in load_flagged_cards(self.flagged_cards_path)
            if str(card.get("question", "")).strip()
        }

    def _update_current_flag_button(self, card=None):
        card = card or self.deck.current_card()
        if not card:
            self.flag_action.setEnabled(False)
            self.flag_action.set_icon_color("#5d6a85")
            return
        question = str(card.get("question", "")).strip()
        is_flagged = question in self._flagged_question_set()
        self.flag_action.setEnabled(True)
        self.flag_action.set_icon_color("#ef4444" if is_flagged else FLAGGED)

    def _toggle_current_flag(self):
        if self._error or not self.deck.total:
            return
        card = self.deck.current_card()
        if not card:
            return
        toggle_flagged_card(card, self.flagged_cards_path)
        self._reload_review_counts()
        self._refresh_deck_buttons()
        self._refresh_subjects_page()
        self._refresh_dashboard()
        self._update_current_flag_button(card)

    def _reset_mastered_to_main(self):
        if not self.subject_name:
            self.show_subjects()
            return
        cards, error = load_cards(self.cards_path)
        if error:
            QMessageBox.warning(self, "Грешка", error)
            return
        shuffled_cards = shuffle_card_bank(cards)
        save_cards(shuffled_cards, self.cards_path)
        wrong_cards = load_cards(self.wrong_cards_path)[0]
        if wrong_cards:
            save_cards(sync_cards_to_bank(shuffled_cards, wrong_cards), self.wrong_cards_path)
        clear_mastered_state(self.mastered_cards_path, self.mastery_progress_path)
        clear_completed_state(self.completed_cards_path, self.completed_progress_path)
        self._reload_review_counts()
        self._load_main_deck()
        self._refresh_subjects_page()
        self._refresh_dashboard()
        self.show_quiz()

    # ── Summary / persistence ───────────────────────────────────────────

    def _save_session_if_needed(self):
        correct, answered = self.deck.session_score()
        total = self.deck.total
        score_pct = round(correct / total * 100) if total else 0
        correct_cards = self.deck.correct_cards()
        self._missed_cards = self.deck.missed_cards()
        self.score_label.setText(f"{score_pct}%")
        self.score_sub_label.setText(f"{correct} точни од {total} прашања")

        if self._session_saved or self._error or not self.deck.total:
            return

        wrong_status = "Погрешните не се променети"
        try:
            if self._deck_mode == "wrong_set":
                tainted = tainted_question_set(self.tainted_path)
                redemption = load_redemption_strikes(self.redemption_strikes_path)
                redeemed = []
                keep_in_wrong = set()
                for card in correct_cards:
                    question = str(card.get("question", "")).strip()
                    if question in tainted:
                        count = redemption.get(question, 0) + 1
                        redemption[question] = count
                        if count >= 2:
                            redeemed.append(card)
                            del redemption[question]
                        else:
                            keep_in_wrong.add(question)
                save_redemption_strikes(redemption, self.redemption_strikes_path)
                clearable = [
                    card for card in correct_cards if str(card.get("question", "")).strip() not in keep_in_wrong
                ]
                clear_wrong_cards(clearable, self.wrong_cards_path)
                if redeemed:
                    clear_tainted_questions(redeemed, self.tainted_path)
                    strikes = load_wrong_strikes(self.wrong_strikes_path)
                    for card in redeemed:
                        strikes.pop(str(card.get("question", "")).strip(), None)
                    save_wrong_strikes(strikes, self.wrong_strikes_path)
                wrong_status = f"Вратени {len(clearable)} картички во Главен сет"
            else:
                wrong_set_cards = [
                    card
                    for card in self._missed_cards
                    if str(card.get("question", "")).strip() not in self._streak_reset_questions
                ]
                merge_wrong_cards(wrong_set_cards, self.wrong_cards_path, tainted_path=None)
                wrong_status = "Ажурирани погрешни"
        except Exception:
            wrong_status = "Не може да се ажурира wrong_cards.json"

        mastered_status = "Прескокнато ажурирање на совладани"
        if self._deck_mode == "main" and answered:
            try:
                update_mastered_cards(
                    correct_cards,
                    self._missed_cards,
                    self.mastered_cards_path,
                    self.mastery_progress_path,
                    tainted_path=self.tainted_path,
                )
                mastered_status = "Ажурирани совладани"
            except Exception:
                mastered_status = "Не може да се ажурира mastered_cards.json"

        completed_status = "Прескокнато ажурирање на готови"
        if self._deck_mode == "mastered" and answered:
            try:
                update_completed_cards(
                    correct_cards,
                    self._missed_cards,
                    self.completed_cards_path,
                    self.completed_progress_path,
                    mastered_path=self.mastered_cards_path,
                    mastered_progress_path=self.mastery_progress_path,
                )
                completed_status = "Ажурирани готови"
            except Exception:
                completed_status = "Не може да се ажурира completed_cards.json"

        session_saved = False
        try:
            save_session(
                score_pct,
                correct,
                total,
                self._missed_cards,
                self.sessions_path,
                deck_mode=self._deck_mode,
            )
            session_saved = True
        except Exception:
            session_saved = False

        if session_saved:
            self.summary_hint_label.setText(
                f"Зачувано во sessions.json • {wrong_status} • {mastered_status} • {completed_status}"
            )
        else:
            self.summary_hint_label.setText(
                f"Не може да се зачува sessions.json • {wrong_status} • {mastered_status} • {completed_status}"
            )

        self._session_saved = session_saved
        self._reload_review_counts()
        self._refresh_deck_buttons()
        self._refresh_subjects_page()
        self._refresh_dashboard()

    def show_summary(self):
        self._save_session_if_needed()
        clear_layout(self.summary_missed_layout)
        missed_questions = [card["question"] for card in self._missed_cards]
        if missed_questions:
            for question in missed_questions:
                row = make_card("Card")
                row_layout = QVBoxLayout(row)
                row_layout.setContentsMargins(14, 14, 14, 14)
                row_layout.addWidget(make_label(question, None, word_wrap=True))
                self.summary_missed_layout.addWidget(row)
        else:
            perfect = make_card("Card")
            perfect_layout = QVBoxLayout(perfect)
            perfect_layout.setContentsMargins(14, 14, 14, 14)
            label = make_label("Совршен резултат!", None)
            label.setStyleSheet(f"color:{SUCCESS_TEXT}; font-weight:700;")
            perfect_layout.addWidget(label)
            self.summary_missed_layout.addWidget(perfect)
        self.summary_missed_layout.addStretch(1)
        self._refresh_deck_buttons()
        self._set_active_page("summary")

    # ── Tainted ──────────────────────────────────────────────────────────

    def _refresh_tainted_page(self):
        clear_layout(self.tainted_layout)
        questions = sorted(load_tainted_questions(self.tainted_path)) if self.subject_name else []
        self.tainted_count_label.setText(f"{len(questions)} tainted прашање/а")
        if not questions:
            self.tainted_layout.addWidget(make_label("Нема tainted прашања.", "EmptyState"))
            self.tainted_layout.addStretch(1)
            return
        for question in questions:
            row = make_card("TaintedCard")
            row_layout = QHBoxLayout(row)
            row_layout.setContentsMargins(14, 14, 14, 14)
            row_layout.setSpacing(12)
            row_layout.addWidget(make_label(question, None, word_wrap=True), 1)
            remove_btn = QPushButton("Отстрани")
            set_button_role(remove_btn, "ghost")
            remove_btn.clicked.connect(lambda _checked=False, q=question: self._remove_tainted(q))
            row_layout.addWidget(remove_btn)
            self.tainted_layout.addWidget(row)
        self.tainted_layout.addStretch(1)

    def show_tainted(self):
        self._refresh_tainted_page()
        self._set_active_page("tainted")

    def _remove_tainted(self, question):
        remaining = [q for q in load_tainted_questions(self.tainted_path) if str(q).strip() != question]
        save_tainted_questions(remaining, self.tainted_path)
        self._refresh_tainted_page()

    def _clear_all_tainted(self):
        confirm, ok = QInputDialog.getText(
            self,
            "Потврди",
            "Ова ќе ги отстрани сите tainted прашања.\nВнеси 'ИСЧИСТИ' за да потврдиш:",
        )
        if not ok or confirm != "ИСЧИСТИ":
            return
        save_tainted_questions([], self.tainted_path)
        self._refresh_tainted_page()

    def show_guide(self):
        self._set_active_page("guide")

    # ── UI state refreshers ─────────────────────────────────────────────

    def _refresh_deck_buttons(self):
        button_groups = {
            f"Погрешни ({self._wrong_count})": (self.wrong_set_btn, self.summary_wrong_btn, self.home_wrong_btn),
            f"Означени ({self._flagged_count})": (self.flagged_set_btn, self.summary_flagged_btn, self.home_flagged_btn),
            f"Совладани ({self._mastered_count})": (self.mastered_set_btn, self.summary_mastered_btn, self.home_mastered_btn),
            f"Готови ({self._completed_count})": (self.completed_set_btn, self.summary_completed_btn, self.home_completed_btn),
        }
        for text, buttons in button_groups.items():
            for button in buttons:
                button.setText(text)
        availability = {
            "wrong": self._wrong_count > 0,
            "flagged": self._flagged_count > 0,
            "mastered": self._mastered_count > 0,
            "completed": self._completed_count > 0,
        }
        for enabled, buttons in [
            (availability["wrong"], (self.wrong_set_btn, self.summary_wrong_btn, self.home_wrong_btn)),
            (availability["flagged"], (self.flagged_set_btn, self.summary_flagged_btn, self.home_flagged_btn)),
            (availability["mastered"], (self.mastered_set_btn, self.summary_mastered_btn, self.home_mastered_btn)),
            (availability["completed"], (self.completed_set_btn, self.summary_completed_btn, self.home_completed_btn)),
        ]:
            for button in buttons:
                button.setEnabled(enabled)


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Mozokce")
    app.setStyle("Fusion")
    font = QFont("Segoe UI")
    font.setPointSize(11)
    app.setFont(font)
    window = FlashcardQtApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
