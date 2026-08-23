package de.ffl.dto;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
    @NotBlank
    private String login;

    @NotBlank
    private String password;

    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login == null ? null : login.trim(); }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}