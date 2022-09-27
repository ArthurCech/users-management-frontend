import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { HeaderType } from '../enum/header-type.enum';
import { NotificationType } from '../enum/notification-type.enum';
import { User } from '../model/user.model';
import { AuthenticationService } from '../service/authentication.service';
import { NotificationService } from '../service/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  public showLoading: boolean = false;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.authenticationService.isUserLoggedIn()) {
      this.router.navigate(['/user/management']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  public onLogin(user: User): void {
    this.showLoading = true;
    this.subscriptions.push(
      this.authenticationService.login(user).subscribe(
        (loggedInUser: HttpResponse<User>) => {
          this.showLoading = false;

          const token = loggedInUser.headers.get(HeaderType.JWT_TOKEN);

          this.authenticationService.saveToken(token);
          this.authenticationService.addUserToLocalCache(loggedInUser.body);

          this.router.navigate(['/user/management']);
        },
        (errorResponse: HttpErrorResponse) => {
          this.showLoading = false;

          this.sendErrorNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  private sendErrorNotification(
    notificationType: NotificationType,
    message: string
  ): void {
    if (message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(
        notificationType,
        'An error occurred. Please try again'
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
