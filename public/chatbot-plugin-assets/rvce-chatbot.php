<?php
/**
 * Plugin Name: RVCE Chatbot
 * Description: Premium conversational AI chatbot for RV College of Engineering (RVCE). Empowers prospective students, parents, and visitors to inquire about engineering programs, KCET/COMEDK/Management admissions, 17 department faculty & HOD directories, hostel amenities, cutoffs, placements, and campus life. Includes an integrated settings dashboard and live analytics command center.
 * Version: 3.0.0
 * Author: RVCE Team
 * License: GPL-2.0+
 * Text Domain: rvce-chatbot
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

// Define Constants
define('RVCE_CHATBOT_VERSION', '3.0.0');
define('RVCE_CHATBOT_DIR_PATH', plugin_dir_path(__FILE__));
define('RVCE_CHATBOT_DIR_URL', plugin_dir_url(__FILE__));

/**
 * Register Settings & Analytics Dashboard in WordPress Admin
 */
function rvce_chatbot_add_admin_menu() {
    add_menu_page(
        __('RVCE Chatbot Settings', 'rvce-chatbot'),
        __('RVCE Chatbot', 'rvce-chatbot'),
        'manage_options',
        'rvce-chatbot',
        'rvce_chatbot_settings_page',
        'dashicons-format-chat',
        90
    );

    add_submenu_page(
        'rvce-chatbot',
        __('Analytics Dashboard', 'rvce-chatbot'),
        __('Analytics Dashboard', 'rvce-chatbot'),
        'manage_options',
        'rvce-chatbot-dashboard',
        'rvce_chatbot_analytics_dashboard_page'
    );
}
add_action('admin_menu', 'rvce_chatbot_add_admin_menu');

/**
 * Render the Analytics Dashboard via Secure iframe
 */
function rvce_chatbot_analytics_dashboard_page() {
    $central_url = get_option('rvce_chatbot_vercel_url', 'http://localhost:3001');
    ?>
    <div class="wrap" style="margin: 0; padding: 0; max-width: 100%; height: calc(100vh - 32px);">
        <div style="background:#0f172a; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155;">
            <div style="color:#fff; font-weight:700; font-size:14px; display:flex; align-items:center; gap:8px;">
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#10b981;"></span>
                RVCE Microsoft Clarity Live Command Center
            </div>
            <div>
                <a href="<?php echo esc_url($central_url); ?>" target="_blank" class="button button-primary" style="background:#6366f1; border-color:#6366f1;">
                    Open Full Command Center ↗
                </a>
            </div>
        </div>
        <iframe src="<?php echo esc_url($central_url); ?>" style="width: 100%; height: calc(100% - 50px); border: none;"></iframe>
    </div>
    <?php
}

/**
 * Secure Admin-Post Router for Dashboard Tabs
 */
function rvce_chatbot_render_dashboard_tab() {
    if (!current_user_can('manage_options')) {
        wp_die(__('Unauthorized user access.', 'rvce-chatbot'));
    }

    $tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'index';
    $allowed_tabs = array('index', 'interactions', 'sessions', 'leads', 'analytics', 'login');

    if (!in_array($tab, $allowed_tabs, true)) {
        wp_die(__('Invalid dashboard tab requested.', 'rvce-chatbot'));
    }

    $file_path = RVCE_CHATBOT_DIR_PATH . 'dashboard/' . $tab . '.php';

    if (file_exists($file_path)) {
        include $file_path;
    } else {
        wp_die(__('Dashboard tab component not found.', 'rvce-chatbot'));
    }
    exit;
}
add_action('admin_post_rvce_chatbot_dashboard_view', 'rvce_chatbot_render_dashboard_tab');

/**
 * Register Settings and Sanitization
 */
function rvce_chatbot_register_settings() {
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_enabled', array('sanitize_callback' => 'sanitize_text_field'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_title', array('sanitize_callback' => 'sanitize_text_field'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_status_text', array('sanitize_callback' => 'sanitize_text_field'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_welcome_text', array('sanitize_callback' => 'sanitize_textarea_field'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_vercel_url', array('sanitize_callback' => 'esc_url_raw'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_sheets_url', array('sanitize_callback' => 'esc_url_raw'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_logo_url', array('sanitize_callback' => 'esc_url_raw'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_receiver_email', array('sanitize_callback' => 'sanitize_email'));
    register_setting('rvce_chatbot_options_group', 'rvce_chatbot_sender_email', array('sanitize_callback' => 'sanitize_email'));
}
add_action('admin_init', 'rvce_chatbot_register_settings');

/**
 * Settings Page HTML Rendering
 */
function rvce_chatbot_settings_page() {
    $default_logo = RVCE_CHATBOT_DIR_URL . 'logo.png';
    ?>
    <div class="wrap" style="max-width: 900px;">
        <div style="display:flex; align-items:center; gap:14px; margin-top:20px; margin-bottom:10px;">
            <div style="width:40px; height:40px; background:#e31e24; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:20px; box-shadow:0 0 15px rgba(227,30,36,0.4);">R</div>
            <div>
                <h1 style="margin:0; font-size:24px;"><?php echo esc_html(__('RVCE Chatbot Settings', 'rvce-chatbot')); ?></h1>
                <p style="margin:2px 0 0; color:#64748b;"><?php echo esc_html(__('Configure display titles, behavior, notification emails, and dual-write telemetry endpoints.', 'rvce-chatbot')); ?></p>
            </div>
        </div>

        <form method="post" action="options.php"
            style="background: #ffffff; padding: 25px 30px; border-radius: 12px; border:1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-top: 20px;">
            <?php settings_fields('rvce_chatbot_options_group'); ?>
            <?php do_settings_sections('rvce_chatbot_options_group'); ?>

            <table class="form-table" style="width: 100%;">
                <!-- Enabled Option -->
                <tr valign="top">
                    <th scope="row" style="width: 220px; font-weight: bold;"><?php _e('Enable Chatbot Widget', 'rvce-chatbot'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="rvce_chatbot_enabled" value="1" <?php checked('1', get_option('rvce_chatbot_enabled', '1')); ?> />
                            <span><?php _e('Display the floating chatbot on the website frontend.', 'rvce-chatbot'); ?></span>
                        </label>
                    </td>
                </tr>

                <!-- Header Title -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Chatbot Header Title', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="text" name="rvce_chatbot_title"
                            value="<?php echo esc_attr(get_option('rvce_chatbot_title', 'RVCE Assistant')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;" required />
                        <p class="description"><?php _e('The header title displayed at the top of the chat window.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Status Text -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Status Message', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="text" name="rvce_chatbot_status_text"
                            value="<?php echo esc_attr(get_option('rvce_chatbot_status_text', 'Online — Ready to help')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;" required />
                        <p class="description"><?php _e('Status text beneath the title (e.g. Online — Ready to help).', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Welcome Teaser Text -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Welcome Prompt Teaser', 'rvce-chatbot'); ?></th>
                    <td>
                        <textarea name="rvce_chatbot_welcome_text" rows="3" class="large-text"
                            style="width: 100%; max-width: 480px;"
                            required><?php echo esc_textarea(get_option('rvce_chatbot_welcome_text', 'Hi there! Have questions about RVCE admissions, placements, or courses? Chat with us!')); ?></textarea>
                        <p class="description"><?php _e('Teaser bubble displayed next to the floating launcher button.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Central Dashboard Server / Node Backend URL -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Central Backend URL (Command Center)', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="url" name="rvce_chatbot_vercel_url"
                            value="<?php echo esc_url(get_option('rvce_chatbot_vercel_url', 'http://localhost:3001')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;"
                            placeholder="http://localhost:3001 or https://your-central-dashboard.vercel.app" />
                        <p class="description"><?php _e('Central Node.js / Microsoft Clarity Command Center URL (without /api). Telemetry will stream directly here to track user chat lifecycle (Start to End).', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Google Sheets API URL -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Google Sheets Webhook URL', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="url" name="rvce_chatbot_sheets_url"
                            value="<?php echo esc_url(get_option('rvce_chatbot_sheets_url', '')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;"
                            placeholder="https://script.google.com/macros/s/.../exec" />
                        <p class="description"><?php _e('Optional Google Apps Script webhook to automatically forward student admission leads.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Custom Logo URL -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Custom Logo URL', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="url" name="rvce_chatbot_logo_url"
                            value="<?php echo esc_url(get_option('rvce_chatbot_logo_url', $default_logo)); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;" />
                        <p class="description"><?php _e('Image URL of the RVCE logo for the header and bot messages.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Receiver Email -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Admissions Notification Email', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="email" name="rvce_chatbot_receiver_email"
                            value="<?php echo esc_attr(get_option('rvce_chatbot_receiver_email', 'admissions@rvce.edu.in')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;" required />
                        <p class="description"><?php _e('Email address where new inquiry lead alerts will be delivered.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>

                <!-- Sender Email -->
                <tr valign="top">
                    <th scope="row" style="font-weight: bold;"><?php _e('Sender Email (From)', 'rvce-chatbot'); ?></th>
                    <td>
                        <input type="email" name="rvce_chatbot_sender_email"
                            value="<?php echo esc_attr(get_option('rvce_chatbot_sender_email', 'chatbot@rvce.edu.in')); ?>"
                            class="regular-text" style="width: 100%; max-width: 480px;" required />
                        <p class="description"><?php _e('Email address displayed as the sender in notifications.', 'rvce-chatbot'); ?></p>
                    </td>
                </tr>
            </table>

            <?php submit_button(__('Save RVCE Settings', 'rvce-chatbot'), 'primary', 'submit', true, array('style' => 'margin-top: 20px;')); ?>
        </form>
    </div>
    <?php
}

/**
 * Enqueue Styles and Scripts for Frontend
 */
function rvce_chatbot_enqueue_assets() {
    if (get_option('rvce_chatbot_enabled', '1') !== '1') {
        return;
    }

    $default_logo = RVCE_CHATBOT_DIR_URL . 'logo.png';
    $custom_logo = trim(get_option('rvce_chatbot_logo_url', ''));
    $logo_url = !empty($custom_logo) ? $custom_logo : $default_logo;

    // Google Fonts
    wp_enqueue_style(
        'rvce-chatbot-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
        array(),
        null
    );

    // Chatbot Stylesheet
    wp_enqueue_style(
        'rvce-chatbot-style',
        RVCE_CHATBOT_DIR_URL . 'style.css',
        array('rvce-chatbot-fonts'),
        RVCE_CHATBOT_VERSION
    );

    // Telemetry Engine (Dual-Write)
    wp_enqueue_script(
        'rvce-chatbot-telemetry',
        RVCE_CHATBOT_DIR_URL . 'telemetry.js',
        array(),
        RVCE_CHATBOT_VERSION,
        true
    );

    // Core Chatbot Engine
    wp_enqueue_script(
        'rvce-chatbot-script',
        RVCE_CHATBOT_DIR_URL . 'script.js',
        array('rvce-chatbot-telemetry'),
        RVCE_CHATBOT_VERSION,
        true
    );

    // Localize Script with Settings
    wp_localize_script(
        'rvce-chatbot-script',
        'rvceChatbotSettings',
        array(
            'logoUrl'         => esc_url($logo_url),
            'title'           => esc_html(get_option('rvce_chatbot_title', 'RVCE Assistant')),
            'statusText'      => esc_html(get_option('rvce_chatbot_status_text', 'Online — Ready to help')),
            'welcomeText'     => esc_html(get_option('rvce_chatbot_welcome_text', 'Hi there! Have questions about RVCE admissions, placements, or courses? Chat with us!')),
            'googleSheetsUrl' => esc_url_raw(get_option('rvce_chatbot_sheets_url', '')),
            'restUrl'         => esc_url_raw(rest_url('rvce/v1')),
            'vercelUrl'       => esc_url_raw(get_option('rvce_chatbot_vercel_url', 'http://localhost:3001')),
            'ajaxUrl'         => admin_url('admin-ajax.php'),
            'nonce'           => wp_create_nonce('rvce_chatbot_nonce')
        )
    );

    // Backward compatibility for legacy AJAX callers
    wp_localize_script(
        'rvce-chatbot-script',
        'rvceChatbotAjax',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php')
        )
    );
}
add_action('wp_enqueue_scripts', 'rvce_chatbot_enqueue_assets');

/**
 * Render Chatbot Widget in Footer
 */
function rvce_chatbot_render_footer_html() {
    if (get_option('rvce_chatbot_enabled', '1') !== '1') {
        return;
    }

    $default_logo = RVCE_CHATBOT_DIR_URL . 'logo.png';
    $custom_logo = trim(get_option('rvce_chatbot_logo_url', ''));
    $logo_url = !empty($custom_logo) ? $custom_logo : $default_logo;
    $title = esc_html(get_option('rvce_chatbot_title', 'RVCE Assistant'));
    $status_text = esc_html(get_option('rvce_chatbot_status_text', 'Online — Ready to help'));
    $welcome = esc_html(get_option('rvce_chatbot_welcome_text', 'Hi there! Have questions about RVCE admissions, placements, or courses? Chat with us!'));
    ?>
    <!-- RVCE Chatbot Root Container -->
    <div id="rvce-chatbot-root" class="rvce-chatbot-widget">
        <canvas id="particles"></canvas>

        <div class="app-container">
            <!-- Floating Chat Widget Button -->
            <button class="chat-fab" id="chatFab" title="Chat with RVCE Assistant" aria-label="Open RVCE chatbot" role="button" aria-expanded="false">
                <span class="fab-icon open-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </span>
                <span class="fab-icon close-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </span>
                <span class="fab-badge" id="fabBadge">1</span>
            </button>

            <!-- Chat Window Dialog -->
            <div class="chat-window" id="chatWindow" role="dialog" aria-label="RVCE Chatbot" aria-modal="false">
                <!-- Header -->
                <div class="chat-header">
                    <div class="header-left">
                        <div class="avatar-container">
                            <div class="avatar" style="overflow:hidden; display:flex; align-items:center; justify-content:center;">
                                <img src="<?php echo esc_url($logo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none';">
                            </div>
                            <div class="avatar-ring"></div>
                        </div>
                        <div class="header-info">
                            <h1><?php echo $title; ?></h1>
                            <div class="status-row">
                                <span class="status-dot"></span>
                                <span class="status-text"><?php echo $status_text; ?></span>
                            </div>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="clear-btn" id="clearBtn" title="Clear Chat" aria-label="Clear chat history">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                        <div class="tone-switch pro" id="toneSwitch" title="Toggle tone" role="switch" aria-checked="true" aria-label="Toggle between funny and professional tone" tabindex="0">
                            <div class="tone-track">
                                <span class="tone-emoji funny-emoji">😄</span>
                                <span class="tone-emoji pro-emoji">🎓</span>
                                <div class="tone-thumb" id="toneThumb"></div>
                            </div>
                            <span class="tone-current-label" id="toneLabel">Professional</span>
                        </div>
                    </div>
                </div>

                <!-- Messages Log -->
                <div class="chat-messages" id="chatMessages" role="log" aria-live="polite" aria-label="Chat messages"></div>

                <!-- Typing Indicator -->
                <div class="typing-indicator" id="typingIndicator">
                    <div class="typing-bubble">
                        <div class="typing-av">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        </div>
                        <div class="typing-dots"><span></span><span></span><span></span></div>
                    </div>
                </div>

                <!-- Quick Suggestion Chips -->
                <div class="quick-suggestions" id="quickSuggestions">
                    <button class="suggestion-chip" data-query="menu">📋 Main Menu</button>
                    <button class="suggestion-chip" data-query="placements">💼 Placements 2024</button>
                    <button class="suggestion-chip" data-query="departments">🏛️ 17 Departments</button>
                    <button class="suggestion-chip" data-query="kcet cutoff">🎯 KCET Cutoffs</button>
                    <button class="suggestion-chip" data-query="contact">📞 Contact RVCE</button>
                </div>

                <!-- Input Area -->
                <div class="chat-input-area" style="position: relative;">
                    <div id="typeahead" class="typeahead-container hidden"></div>
                    <div class="input-wrapper">
                        <button id="emojiBtn" class="emoji-btn" title="Main Menu" aria-label="Open main menu">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </button>
                        <button id="micBtn" class="mic-btn" title="Voice Search" aria-label="Voice search - speak your question">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" y1="19" x2="12" y2="23"/>
                                <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                        </button>
                        <input type="text" id="userInput" placeholder="Ask anything about RVCE admissions, faculty, cutoffs..." autocomplete="off" aria-label="Type your question about RVCE" maxlength="250">
                        <button id="sendBtn" class="send-btn" title="Send" aria-label="Send message">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
}
add_action('wp_footer', 'rvce_chatbot_render_footer_html', 999);

// Shortcode support
function rvce_chatbot_shortcode() {
    ob_start();
    rvce_chatbot_render_footer_html();
    return ob_get_clean();
}
add_shortcode('rvce_chatbot', 'rvce_chatbot_shortcode');

/**
 * Database Activation Hook & Auto-Provisioning
 */
function rvce_chatbot_activate() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    $table_interactions = $wpdb->prefix . 'rvce_interactions';
    $table_leads = $wpdb->prefix . 'rvce_leads';
    $table_logs = $wpdb->prefix . 'rvce_chat_logs';

    $sql_interactions = "CREATE TABLE $table_interactions (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        session_id varchar(100) NOT NULL,
        event_type varchar(100) NOT NULL,
        interaction_id varchar(255) DEFAULT '',
        query_text text,
        meta_data longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY session_id (session_id),
        KEY event_type (event_type)
    ) $charset_collate;";

    $sql_leads = "CREATE TABLE $table_leads (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        session_id varchar(100) NOT NULL,
        lead_data longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY session_id (session_id)
    ) $charset_collate;";

    $sql_logs = "CREATE TABLE $table_logs (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        session_id varchar(100) NOT NULL,
        query text NOT NULL,
        intent_id varchar(100) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql_interactions);
    dbDelta($sql_leads);
    dbDelta($sql_logs);
}
register_activation_hook(__FILE__, 'rvce_chatbot_activate');

function rvce_chatbot_ensure_tables_exist() {
    global $wpdb;
    $table_interactions = $wpdb->prefix . 'rvce_interactions';
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_interactions'") !== $table_interactions) {
        rvce_chatbot_activate();
    }
}

/**
 * Native WordPress REST API Implementation (/wp-json/rvce/v1/...)
 */
add_action('rest_api_init', function () {
    $namespace = 'rvce/v1';

    // POST /logs (telemetry ingestion from frontend)
    register_rest_route($namespace, '/logs', array(
        'methods' => 'POST',
        'callback' => 'rvce_chatbot_post_logs',
        'permission_callback' => '__return_true'
    ));

    // GET /overview-data, /interactions-data, /sessions-data, /analytics-data
    $dashboard_routes = array('/overview-data', '/interactions-data', '/sessions-data', '/analytics-data');
    foreach ($dashboard_routes as $route) {
        register_rest_route($namespace, $route, array(
            'methods' => 'GET',
            'callback' => 'rvce_chatbot_get_interactions',
            'permission_callback' => '__return_true'
        ));
    }

    // GET /leads-data
    register_rest_route($namespace, '/leads-data', array(
        'methods' => 'GET',
        'callback' => 'rvce_chatbot_get_leads',
        'permission_callback' => '__return_true'
    ));
});

function rvce_chatbot_post_logs($request) {
    rvce_chatbot_ensure_tables_exist();
    global $wpdb;
    $params = $request->get_params();
    $session_id = isset($params['sessionId']) ? sanitize_text_field($params['sessionId']) : 'sess_anon';
    $events = isset($params['events']) ? $params['events'] : array();

    if (empty($events)) {
        return rest_ensure_response(array('success' => true, 'count' => 0, 'message' => 'No events'));
    }

    $table_interactions = $wpdb->prefix . 'rvce_interactions';
    $table_leads = $wpdb->prefix . 'rvce_leads';
    $table_logs = $wpdb->prefix . 'rvce_chat_logs';

    $inserted_count = 0;

    foreach ($events as $e) {
        $event_type = isset($e['eventType']) ? sanitize_text_field($e['eventType']) : 'message';
        $data = isset($e['data']) ? $e['data'] : array();

        // 1. Auto-detect Leads (Form submissions or chat text containing email/phone)
        $is_lead = ($event_type === 'form_submit');
        $extracted_email = '';
        $extracted_phone = '';

        $text_to_scan = wp_json_encode($data);
        if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text_to_scan, $matches)) {
            $extracted_email = $matches[0];
            $is_lead = true;
        }
        if (preg_match('/[0-9]{10}/', $text_to_scan, $matches)) {
            $extracted_phone = $matches[0];
            $is_lead = true;
        }

        if ($is_lead) {
            $lead_payload = isset($data['leadData']) ? $data['leadData'] : $data;
            if (!isset($lead_payload['email']) && $extracted_email) $lead_payload['email'] = $extracted_email;
            if (!isset($lead_payload['phone']) && $extracted_phone) $lead_payload['phone'] = $extracted_phone;
            if (!isset($lead_payload['name'])) {
                if (preg_match('/(?:Name|Full Name)[\:\s]+([a-zA-Z\s]+)(?:Phone|Email|$)/i', $text_to_scan, $n_matches)) {
                    $lead_payload['name'] = trim($n_matches[1]);
                } else {
                    $lead_payload['name'] = 'RVCE Visitor';
                }
            }
            if (!isset($lead_payload['formType'])) $lead_payload['formType'] = 'Admissions Inquiry';

            $wpdb->insert($table_leads, array(
                'session_id' => $session_id,
                'lead_data' => wp_json_encode($lead_payload),
                'created_at' => current_time('mysql', 1)
            ));
        }

        // 2. Format Interaction Identifier & Query Text
        $interactionId = $event_type;
        if ($event_type === 'message') {
            $interactionId = isset($data['intent']) ? sanitize_text_field($data['intent']) : 'unknown';
            // Also store in legacy logs table
            $query_text_msg = isset($data['query']) ? sanitize_text_field($data['query']) : '';
            if (!empty($query_text_msg)) {
                $wpdb->insert($table_logs, array(
                    'session_id' => $session_id,
                    'query' => $query_text_msg,
                    'intent_id' => $interactionId,
                    'created_at' => current_time('mysql', 1)
                ));
            }
        } else if (in_array($event_type, array('click', 'hover', 'copy', 'dwell', 'scroll'), true)) {
            $elementId = isset($data['elementId']) ? sanitize_text_field($data['elementId']) : '';
            $interactionId = $event_type . ':' . $elementId;
        }

        $queryText = isset($data['elementText']) ? sanitize_text_field($data['elementText']) : (isset($data['query']) ? sanitize_text_field($data['query']) : '');
        if (!$queryText) {
            if ($event_type === 'heartbeat') $queryText = 'User active on page (Dwell: ' . (isset($data['dwellTimeSeconds']) ? intval($data['dwellTimeSeconds']) : 0) . 's)';
            else if ($event_type === 'page_load') $queryText = 'Opened RVCE Chatbot';
            else if ($event_type === 'scroll') $queryText = 'Scrolled page';
            else if ($event_type === 'copy') $queryText = 'Copied text to clipboard';
            else $queryText = $event_type;
        }

        $wpdb->insert($table_interactions, array(
            'session_id' => $session_id,
            'event_type' => $event_type,
            'interaction_id' => $interactionId,
            'query_text' => $queryText,
            'meta_data' => wp_json_encode($data),
            'created_at' => current_time('mysql', 1)
        ));

        $inserted_count++;
    }

    return rest_ensure_response(array('success' => true, 'saved' => $inserted_count));
}

function rvce_chatbot_get_interactions($request) {
    rvce_chatbot_ensure_tables_exist();
    global $wpdb;
    $table_name = $wpdb->prefix . 'rvce_interactions';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        return rest_ensure_response(array());
    }

    $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 5000", ARRAY_A);

    $formatted = array();
    foreach ($results as $row) {
        $formatted[] = array(
            's' => $row['session_id'],
            'd' => $row['created_at'],
            't' => ($row['event_type'] === 'message') ? 'message' : (($row['event_type'] === 'page_load') ? 'session' : 'interaction'),
            'i' => $row['interaction_id'],
            'q' => $row['query_text'],
            'm' => json_decode($row['meta_data'], true)
        );
    }
    return rest_ensure_response($formatted);
}

function rvce_chatbot_get_leads($request) {
    rvce_chatbot_ensure_tables_exist();
    global $wpdb;
    $table_name = $wpdb->prefix . 'rvce_leads';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        return rest_ensure_response(array());
    }

    $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 500", ARRAY_A);

    $formatted = array();
    foreach ($results as $row) {
        $formatted[] = array(
            'sessionId' => $row['session_id'],
            'timestamp' => $row['created_at'],
            'data' => json_decode($row['lead_data'], true)
        );
    }
    return rest_ensure_response($formatted);
}

/**
 * AJAX Handler: Send Lead Notification Email
 */
function rvce_chatbot_send_lead_email() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'rvce_chatbot_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed.'), 403);
    }

    $form_type = sanitize_text_field(isset($_POST['formType']) ? $_POST['formType'] : 'Admissions Inquiry');
    $name = sanitize_text_field(isset($_POST['name']) ? $_POST['name'] : 'Prospective Student');
    $phone = sanitize_text_field(isset($_POST['phone']) ? $_POST['phone'] : 'Not provided');
    $email = sanitize_email(isset($_POST['email']) ? $_POST['email'] : '');
    $department = sanitize_text_field(isset($_POST['department']) ? $_POST['department'] : '');
    $quota = sanitize_text_field(isset($_POST['quota']) ? $_POST['quota'] : '');

    $email_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">';
    $email_html .= '<h2 style="color: #e31e24; text-align: center; border-bottom: 2px solid #e31e24; padding-bottom: 12px; margin-top:0;">New RVCE Student Lead Captured</h2>';
    $email_html .= '<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px;">';
    $email_html .= '<p><strong>Lead Type:</strong> <span style="color: #334155;">' . esc_html($form_type) . '</span></p>';
    $email_html .= '<p><strong>Name:</strong> <span style="color: #334155;">' . esc_html($name) . '</span></p>';
    $email_html .= '<p><strong>Phone:</strong> <span style="color: #334155;">' . esc_html($phone) . '</span></p>';
    if ($email) $email_html .= '<p><strong>Email:</strong> <span style="color: #334155;">' . esc_html($email) . '</span></p>';
    if ($department) $email_html .= '<p><strong>Interested Branch:</strong> <span style="color: #334155;">' . esc_html($department) . '</span></p>';
    if ($quota) $email_html .= '<p><strong>Admission Quota:</strong> <span style="color: #334155;">' . esc_html($quota) . '</span></p>';
    $email_html .= '</div>';
    $email_html .= '<p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">Sent automatically by the official RVCE AI Chatbot System.</p>';
    $email_html .= '</div>';

    $receiver_email = get_option('rvce_chatbot_receiver_email', 'admissions@rvce.edu.in');
    $sender_email = get_option('rvce_chatbot_sender_email', 'chatbot@rvce.edu.in');
    $subject = 'New RVCE Inquiry: ' . $form_type . ' - ' . $name;
    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: RVCE Chatbot <' . $sender_email . '>'
    );

    $sent = wp_mail($receiver_email, $subject, $email_html, $headers);

    if ($sent) {
        wp_send_json_success(array('message' => 'Lead email delivered successfully.'));
    } else {
        wp_send_json_error(array('message' => 'Unable to send lead email.'), 500);
    }
}
add_action('wp_ajax_rvce_send_lead', 'rvce_chatbot_send_lead_email');
add_action('wp_ajax_nopriv_rvce_send_lead', 'rvce_chatbot_send_lead_email');

// Legacy chat logging endpoint for backward compatibility
function rvce_legacy_log_chat_query() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'rvce_chat_logs';

    $query = isset($_POST['query']) ? sanitize_text_field($_POST['query']) : '';
    $intent_id = isset($_POST['intent_id']) ? sanitize_text_field($_POST['intent_id']) : '';
    $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : 'anon';

    if (!empty($query)) {
        $wpdb->insert(
            $table_name,
            array(
                'query' => $query,
                'intent_id' => $intent_id,
                'session_id' => $session_id,
                'created_at' => current_time('mysql')
            )
        );
    }
    wp_send_json_success();
}
add_action('wp_ajax_rvce_log_chat', 'rvce_legacy_log_chat_query');
add_action('wp_ajax_nopriv_rvce_log_chat', 'rvce_legacy_log_chat_query');
