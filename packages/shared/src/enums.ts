export enum UserRole {
  Editor = 'Editor',
  Reviewer = 'Reviewer',
  Administrator = 'Administrator',
}

export enum UserStatus {
  Active = 'Active',
  Deactivated = 'Deactivated',
}

export enum ContentStatus {
  Draft = 'Draft',
  InReview = 'InReview',
  Published = 'Published',
  Rejected = 'Rejected',
  Archived = 'Archived',
}

export enum VacancyStatus {
  Draft = 'Draft',
  InReview = 'InReview',
  Published = 'Published',
  Closed = 'Closed',
  Archived = 'Archived',
}

export enum InterviewType {
  CallForInterview = 'CallForInterview',
  InterviewResult = 'InterviewResult',
}

export enum AuditAction {
  Create = 'Create',
  Update = 'Update',
  Publish = 'Publish',
  Reject = 'Reject',
  Delete = 'Delete',
  AuthSuccess = 'AuthSuccess',
  AuthFailure = 'AuthFailure',
}