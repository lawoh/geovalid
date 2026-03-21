/**
 * GéoValid Québec - Page d'aide
 * Animations et interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Animation des cards au scroll
    const cards = document.querySelectorAll('.card, .column-box, .format-box, .validation-box');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
    
    // Ouvrir automatiquement le premier FAQ
    const firstDetails = document.querySelector('.faq details');
    if (firstDetails) {
        firstDetails.open = true;
    }
});
