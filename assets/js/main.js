/**
* Template Name: iPortfolio - v1.2.1
* Template URL: https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
!(function($) {
  "use strict";

  // Hero typed
  if ($('.typed').length) {
    var typed_strings = $(".typed").data('typed-items');
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  // Smooth scroll for the navigation menu and links with .scrollto classes
  var scrolling = false;

  function scrollToSection(hash, instant) {
    var target = $(hash);
    if (!target.length) return false;

    var scrollto = target.offset().top;

    $('.nav-menu .active, .mobile-nav .active').removeClass('active');
    $('.nav-menu, #mobile-nav').find('a[href="' + hash + '"]').closest('li').addClass('active');

    if (instant) {
      $('html, body').scrollTop(scrollto);
    } else {
      scrolling = true;
      $('html, body').animate({ scrollTop: scrollto }, 500, 'swing', function() {
        scrolling = false;
      });
    }

    return true;
  }

  $(document).on('click', '.nav-menu a, .scrollto', function(e) {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      e.preventDefault();

      if (scrollToSection(this.hash)) {
        // Update the address bar so the section can be shared/bookmarked,
        // without triggering the browser's own (jumpy) hash navigation.
        if (history.pushState) {
          history.pushState(null, '', this.hash);
        } else {
          location.hash = this.hash;
        }

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
        }

        return false;
      }
    }
  });

  // If the page was opened with a section hash in the URL (e.g. a shared
  // link to index.html#teaching), jump straight to that section.
  if (location.hash) {
    $(window).on('load', function() {
      scrollToSection(location.hash, true);
    });
  }

  $(document).on('click', '.mobile-nav-toggle', function(e) {
    $('body').toggleClass('mobile-nav-active');
    $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
  });

  $(document).click(function(e) {
    var container = $(".mobile-nav-toggle");
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      if ($('body').hasClass('mobile-nav-active')) {
        $('body').removeClass('mobile-nav-active');
        $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
      }
    }
  });

  // Navigation active state on scroll
  var nav_sections = $('section');
  var main_nav = $('.nav-menu, #mobile-nav');

  $(window).on('scroll', function() {
    if (scrolling) return;

    var cur_pos = $(this).scrollTop() + 50;
    var active_id = null;

    nav_sections.each(function() {
      var top = $(this).offset().top,
        bottom = top + $(this).outerHeight();
      if (cur_pos >= top && cur_pos <= bottom) {
        active_id = $(this).attr('id');
      }
    });

    main_nav.find('li').removeClass('active');
    if (cur_pos < 200 || !active_id) {
      $('.nav-menu ul:first li:first').addClass('active');
    } else {
      main_nav.find('a[href="#' + active_id + '"]').parent('li').addClass('active');
    }
  });

  // Back to top button
  $(window).scroll(function() {
    if ($(this).scrollTop() > 100) {
      $('.back-to-top').fadeIn('slow');
    } else {
      $('.back-to-top').fadeOut('slow');
    }
  });

  $('.back-to-top').click(function() {
    $('html, body').animate({ scrollTop: 0 }, 500, 'swing');
    return false;
  });

  // Initi AOS
  AOS.init({
    duration: 1000,
    easing: "ease-in-out-back"
  });

})(jQuery);