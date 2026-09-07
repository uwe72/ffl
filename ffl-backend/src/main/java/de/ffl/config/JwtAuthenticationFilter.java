package de.ffl.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final AntPathMatcher TOKEN_PARAM_PATH_MATCHER = new AntPathMatcher();

    private static final List<String> TOKEN_PARAM_ALLOWED_PATTERNS = List.of(
        "/api/seasons/*/calculate-stream",
        "/api/seasons/*/invitation-mail/stream",
        "/api/seasons/*/reminder-mail/stream",
        "/api/seasons/*/transparency-mail/stream",
        "/api/seasons/*/prize-distribution/mail/stream",
        "/api/seasons/setup/stream-sse",
        "/api/seasons/setup/update-players/stream-sse"
    );

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.equals("/api/auth/me") || path.startsWith("/api/auth/me/")) return false;
        return path.startsWith("/api/migration/") ||
               path.startsWith("/api/auth/") ||
               path.startsWith("/swagger-ui/") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/api/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (UsernameNotFoundException ex) {
            logger.warn("JWT verweist auf unbekannten User: " + ex.getMessage());
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            if (isTokenParamAllowed(request)) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Token from query parameter found for request: " + request.getRequestURI());
                }
                return tokenParam;
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Token from query parameter rejected for request: " + request.getRequestURI());
            }
        }
        if (logger.isDebugEnabled()) {
            logger.debug("No token found for request: " + request.getRequestURI());
        }
        return null;
    }

    private boolean isTokenParamAllowed(HttpServletRequest request) {
        String rawPath = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && rawPath.startsWith(contextPath)) {
            rawPath = rawPath.substring(contextPath.length());
        }
        if (rawPath.length() > 1 && rawPath.endsWith("/")) {
            rawPath = rawPath.substring(0, rawPath.length() - 1);
        }
        final String path = rawPath;
        return TOKEN_PARAM_ALLOWED_PATTERNS.stream()
            .anyMatch(pattern -> TOKEN_PARAM_PATH_MATCHER.match(pattern, path));
    }
}