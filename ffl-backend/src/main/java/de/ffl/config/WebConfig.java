package de.ffl.config;

import org.springframework.boot.web.server.MimeMappings;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> webServerFactoryCustomizer() {
        return factory -> {
            MimeMappings mappings = new MimeMappings(MimeMappings.DEFAULT);
            mappings.add("webmanifest", "application/manifest+json");
            factory.setMimeMappings(mappings);
        };
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCachePeriod(31536000);

        registry.addResourceHandler("/*.png", "/*.svg", "/*.ico", "/*.jpg", "/*.jpeg", "/*.gif", "/*.woff", "/*.woff2", "/*.ttf", "/*.eot")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(31536000);

        registry.addResourceHandler("/manifest.webmanifest", "/sw.js", "/index.html", "/")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
    }
}
