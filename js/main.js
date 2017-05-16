particlesJS('particles-js', {
  'particles': {
    'number': {
      'value': 30,
      'density': {
        'enable': true,
        'value_area': 700
      }
    },
    'color': {
      'value': '#777777'
    },
    'shape': {
      'type': 'circle',
      'stroke': {
        'width': 2,
        'color': '#666666'
      },
      'polygon': {
        'nb_sides': 5
      },
      'image': {
        'src': 'img/github.svg',
        'width': 100,
        'height': 100
      }
    },
    'opacity': {
      'value': 0,
      'random': false,
      'anim': {
        'enable': false,
        'speed': 1,
        'opacity_min': 0.1,
        'sync': false
      }
    },
    'size': {
      'value': 15,
      'random': true,
      'anim': {
        'enable': false,
        'speed': 40,
        'size_min': 0.1,
        'sync': false
      }
    },
    'line_linked': {
      'enable': false,
      'distance': 150,
      'color': '#ffffff',
      'opacity': 0.4,
      'width': 1
    },
    'move': {
      'enable': true,
      'speed': 6,
      'direction': 'top',
      'random': true,
      'straight': false,
      'out_mode': 'out',
      'bounce': false,
      'attract': {
        'enable': false,
        'rotateX': 600,
        'rotateY': 1200
      }
    }
  },
  'interactivity': {
    'detect_on': 'window',
    'events': {
      'onhover': {
        'enable': true,
        'mode': 'repulse'
      },
      'onclick': {
        'enable': true,
        'mode': 'push'
      },
      'resize': true
    },
    'modes': {
      'grab': {
        'distance': 140,
        'line_linked': {
          'opacity': 1
        }
      },
      'bubble': {
        'distance': 400,
        'size': 40,
        'duration': 2,
        'opacity': 8,
        'speed': 3
      },
      'repulse': {
        'distance': 150,
        'duration': 0.4
      },
      'push': {
        'particles_nb': 3
      },
      'remove': {
        'particles_nb': 2
      }
    }
  },
  'retina_detect': true
});

$(document).ready(function () {
  $('#home-btn, #home-btn-fixed').click(function () {
    $('html, body').animate({
      scrollTop: $('#home').offset().top
    }, 500);
  });

  $('#about-btn, #about-btn-fixed').click(function () {
    $('html, body').animate({
      scrollTop: $('#about').offset().top
    }, 500);
  });

  $('#projects-btn, #projects-btn-fixed').click(function () {
    $('html, body').animate({
      scrollTop: $('#projects').offset().top
    }, 500);
  });

  $('#contact-btn, #contact-btn-fixed').click(function () {
    $('html, body').animate({
      scrollTop: $('#contact').offset().top
    }, 500);
  });

  $('#projects-btn').click(function () {
    $('html, body').animate({
      scrollTop: $('#projects').offset().top
    }, 500);
  });

  $(window).scroll(function () {
    $('.nav-main').css('opacity', 1 - $(window).scrollTop() / 1000);
  });

  $(window).scroll(function () {
    $('.nav-fixed').css('opacity', 0 + $(window).scrollTop() / 1400);
  });

  $(window).on('resize', function () {
    if ($(window).width() <= 800) {
      // Resize Social icons on mobile
      $('social').removeClass('fa-2x');
      $('#social').addClass('fa-3x');
      // Hide navbars on mobile
      $('#navbar-main').hide();
    } else {
      // Opposite effect of most methods above
      $('#social').removeClass('fa-3x');
      $('#navbar-main').show();
    };
  });

  // Compatibility for browsers which don't auto-resize
  if ($(window).width() <= 800) {
    // Resize Social icons on mobile
    $('social').removeClass('fa-2x');
    $('#social').addClass('fa-3x');
    // Hide navbars on mobile
    $('#navbar-main').hide();
  } else {
    // Opposite effect of most methods above
    $('#social').removeClass('fa-3x');
    $('#navbar-main').show();
  };

  // Hide fixed navbar if it'll overlap with text
  $(window).on('resize', function () {
    if ($(window).width() <= 1080) {
      $('#navbar-fixed').hide();
    };
  });

  if ($(window).width() <= 1080) {
    $('#navbar-fixed').hide();
  };

});
