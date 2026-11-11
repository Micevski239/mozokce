import pygame
import sys
from pygame.locals import *

# Constants
WINDOW_SIZE = 400
GRID_SIZE = 4
CELL_SIZE = WINDOW_SIZE // GRID_SIZE
FONT_SIZE = 32
BG_COLOR = (255, 255, 255)
GRID_COLOR = (0, 0, 0)
TEXT_COLOR = (0, 0, 255)
HIGHLIGHT_COLOR = (200, 200, 200)

pygame.init()
DISPLAYSURF = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
pygame.display.set_caption("Sudoku Solver")
FONT = pygame.font.Font(None, FONT_SIZE)

# Initial Sudoku Grid (0 represents empty cells)
SUDOKU_GRID = [
    [1, 0, 0, 4],
    [0, 0, 3, 0],
    [0, 4, 0, 0],
    [2, 0, 0, 3]
]


# Helper Functions
def draw_grid(grid, selected=None):
    """Draw the Sudoku grid with optional highlighting."""
    DISPLAYSURF.fill(BG_COLOR)
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            rect = pygame.Rect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
            pygame.draw.rect(DISPLAYSURF, GRID_COLOR, rect, 1)
            if (row, col) == selected:
                pygame.draw.rect(DISPLAYSURF, HIGHLIGHT_COLOR, rect)

            # Draw numbers
            if grid[row][col] != 0:
                text_surface = FONT.render(str(grid[row][col]), True, TEXT_COLOR)
                text_rect = text_surface.get_rect(center=rect.center)
                DISPLAYSURF.blit(text_surface, text_rect)


def is_valid_move(grid, row, col, num):
    """Checks if placing 'num' in grid[row][col] is valid."""
    # Check row
    if num in grid[row]:
        return False
    # Check column
    if num in [grid[r][col] for r in range(GRID_SIZE)]:
        return False
    # Check subgrid
    subgrid_size = int(GRID_SIZE ** 0.5)
    start_row, start_col = (row // subgrid_size) * subgrid_size, (col // subgrid_size) * subgrid_size
    for r in range(start_row, start_row + subgrid_size):
        for c in range(start_col, start_col + subgrid_size):
            if grid[r][c] == num:
                return False
    return True


def is_solved(grid):
    """Checks if the Sudoku grid is completely and correctly filled."""
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if grid[row][col] == 0 or not is_valid_move(grid, row, col, grid[row][col]):
                print("invalid" + str(row) + " " + str(col))
                return False
    return True


# Main Game Loop
def main():
    grid = [row[:] for row in SUDOKU_GRID]
    selected = None
    while True:
        draw_grid(grid, selected)

        for event in pygame.event.get():
            if event.type == QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == MOUSEBUTTONDOWN:
                x, y = event.pos
                selected = y // CELL_SIZE, x // CELL_SIZE
            elif event.type == KEYDOWN and selected:
                row, col = selected
                if event.key == K_BACKSPACE or event.key == K_DELETE:
                    grid[row][col] = 0
                elif K_1 <= event.key <= K_9:
                    num = event.key - K_0
                    if is_valid_move(grid, row, col, num):
                        grid[row][col] = num
                elif event.key == K_RETURN and is_solved(grid):
                    print("Sudoku Solved!")

        pygame.display.update()


if __name__ == "__main__":
    main()
