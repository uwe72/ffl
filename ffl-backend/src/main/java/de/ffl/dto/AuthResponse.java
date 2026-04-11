package de.ffl.dto;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private String type = "Bearer";
    private String login;
    private String role;

    public AuthResponse(String token, String refreshToken, String login, String role) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.login = login;
        this.role = role;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}