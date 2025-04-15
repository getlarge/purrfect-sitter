export interface IAuthorizationCheck {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  relation?: string;
}

export interface IAuthorizationStrategy {
  check(params: IAuthorizationCheck): Promise<boolean>;
}
