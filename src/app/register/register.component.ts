import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { NotificationType } from '../enum/notification-type.enum';
import { User } from '../model/user.model';
import { AuthenticationService } from '../service/authentication.service';
import { NotificationService } from '../service/notification.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit, OnDestroy {
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
    }
  }

  public onRegister(registerForm: NgForm): void {
    const user: User = registerForm.value;

    this.showLoading = true;
    this.subscriptions.push(
      this.authenticationService.register(user).subscribe(
        (createdUser: User) => {
          this.showLoading = false;

          this.sendNotification(
            NotificationType.SUCCESS,
            `A new account was created for ${createdUser.firstName}. Please check your email for the password to log in`
          );

          registerForm.reset();
        },
        (errorResponse: HttpErrorResponse) => {
          this.showLoading = false;

          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  private sendNotification(
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
