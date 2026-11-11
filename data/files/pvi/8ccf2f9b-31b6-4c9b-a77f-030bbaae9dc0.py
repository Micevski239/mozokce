import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Constants
WINDOW_WIDTH = 640
WINDOW_HEIGHT = 480
FPS = 60
BASKET_WIDTH = 80
BASKET_HEIGHT = 20
APPLE_SIZE = 20
BASKET_SPEED = 10
APPLE_SPEED = 5
MAX_MISSED = 5

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)

# Initialize screen
screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("Catch the Apples")

# Clock for controlling frame rate
clock = pygame.time.Clock()

# Functions to handle basket
def create_basket():
    return {
        'x': (WINDOW_WIDTH - BASKET_WIDTH) // 2,
        'y': WINDOW_HEIGHT - BASKET_HEIGHT - 10,
        'width': BASKET_WIDTH,
        'height': BASKET_HEIGHT,
        'speed': BASKET_SPEED
    }

def move_basket(basket, keys):
    if keys[pygame.K_LEFT] and basket['x'] > 0:
        basket['x'] -= basket['speed']
    if keys[pygame.K_RIGHT] and basket['x'] < WINDOW_WIDTH - basket['width']:
        basket['x'] += basket['speed']

def draw_basket(screen, basket):
    pygame.draw.rect(screen, GREEN, (basket['x'], basket['y'], basket['width'], basket['height']))

# Functions to handle apples
def create_apple():
    return {
        'x': random.randint(0, WINDOW_WIDTH - APPLE_SIZE),
        'y': -APPLE_SIZE,
        'size': APPLE_SIZE
    }

def move_apple(apple):
    apple['y'] += APPLE_SPEED

def draw_apple(screen, apple):
    pygame.draw.circle(screen, RED, (apple['x'] + apple['size'] // 2, apple['y'] + apple['size'] // 2), apple['size'] // 2)

# Main game function
def main():
    basket = create_basket()
    apples = [create_apple()]
    score = 0
    missed = 0

    font = pygame.font.Font(None, 36)

    running = True
    while running:
        screen.fill(WHITE)

        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

        # Handle keys
        keys = pygame.key.get_pressed()
        move_basket(basket, keys)

        # Update apples
        for apple in apples[:]:
            move_apple(apple)

            # Check for catching apples
            if (basket['y'] < apple['y'] + apple['size'] and
                basket['x'] < apple['x'] + apple['size'] and
                basket['x'] + basket['width'] > apple['x']):
                apples.remove(apple)
                score += 1
                apples.append(create_apple())

            # Check if apple is missed
            elif apple['y'] > WINDOW_HEIGHT:
                apples.remove(apple)
                missed += 1
                apples.append(create_apple())

        # Check game over condition
        if missed >= MAX_MISSED:
            running = False

        # Draw elements
        draw_basket(screen, basket)
        for apple in apples:
            draw_apple(screen, apple)

        # Display score and missed
        score_text = font.render(f"Score: {score}", True, BLACK)
        missed_text = font.render(f"Missed: {missed}", True, BLACK)
        screen.blit(score_text, (10, 10))
        screen.blit(missed_text, (10, 40))

        # Update display
        pygame.display.flip()
        clock.tick(FPS)

    # Game over screen
    screen.fill(WHITE)
    game_over_text = font.render("Game Over!", True, RED)
    final_score_text = font.render(f"Final Score: {score}", True, BLACK)
    screen.blit(game_over_text, (WINDOW_WIDTH // 2 - game_over_text.get_width() // 2, WINDOW_HEIGHT // 2 - 50))
    screen.blit(final_score_text, (WINDOW_WIDTH // 2 - final_score_text.get_width() // 2, WINDOW_HEIGHT // 2))
    pygame.display.flip()
    pygame.time.wait(3000)

if __name__ == "__main__":
    main()
