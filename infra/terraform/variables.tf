variable "project" {
  description = "Resource name prefix"
  type        = string
  default     = "hosp"
}

variable "environment" {
  description = "staging | production"
  type        = string
  default     = "staging"
}

variable "region" {
  description = "AWS region (all data stays in India)"
  type        = string
  default     = "ap-south-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of AZs to use in ap-south-1"
  type        = number
  default     = 2
}

variable "api_image" {
  description = "API container image (GHCR or ECR)"
  type        = string
  default     = "ghcr.io/example/bangalore-hospital-appointments-api:latest"
}

variable "api_port" {
  type    = number
  default = 4000
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "db_username" {
  type    = string
  default = "appoint"
}

variable "db_name" {
  type    = string
  default = "appointments"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "cors_origins" {
  description = "Comma-separated CORS allow-list for the API"
  type        = string
  default     = "https://appointments.example.in"
}

variable "alert_email" {
  description = "SNS email for CloudWatch alarms (empty = no subscription)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (ap-south-1) for ALB HTTPS listener. No default: must be provided for production."
  type        = string
  default     = ""
}
