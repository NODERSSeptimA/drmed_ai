/* ===== Modal Management ===== */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeOverlay(event, id) {
  if (event.target === event.currentTarget) {
    closeModal(id);
  }
}

/* Close modals with Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.active').forEach(overlay => {
      overlay.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

/* ===== Medical History Sidebar Navigation ===== */
document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = document.querySelectorAll('.mh-sidebar-item');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      /* Update active state */
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      /* Scroll to section */
      const sectionId = item.dataset.section;
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* Intersection observer for sidebar highlighting */
  const sections = document.querySelectorAll('.sec-title[id], .mh-section[id]');
  if (sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          sidebarItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === id);
          });
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(section => observer.observe(section));
  }

  /* Patient row hover effects */
  document.querySelectorAll('.patient-row').forEach(row => {
    row.style.cursor = 'pointer';
  });
});
