package de.ffl.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SpaForwardFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();
        
        if (isApiRequest(path) || isStaticResource(path) || isSwaggerRequest(path)) {
            chain.doFilter(request, response);
        } else {
            RequestDispatcher dispatcher = request.getRequestDispatcher("/");
            dispatcher.forward(request, response);
        }
    }

    private boolean isApiRequest(String path) {
        return path.startsWith("/api/");
    }

    private boolean isStaticResource(String path) {
        return path.startsWith("/assets/") ||
               path.endsWith(".js") ||
               path.endsWith(".css") ||
               path.endsWith(".ico") ||
               path.endsWith(".png") ||
               path.endsWith(".jpg") ||
               path.endsWith(".jpeg") ||
               path.endsWith(".gif") ||
               path.endsWith(".svg") ||
               path.endsWith(".woff") ||
               path.endsWith(".woff2") ||
               path.endsWith(".ttf") ||
               path.endsWith(".eot") ||
               path.endsWith(".webmanifest") ||
               path.equals("/sw.js") ||
               path.equals("/index.html") ||
               path.equals("/");
    }

    private boolean isSwaggerRequest(String path) {
        return path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs");
    }
}
