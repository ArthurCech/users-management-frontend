import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
} from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';

import { NotificationType } from '../enum/notification-type.enum';
import { Role } from '../enum/role.enum';
import { CustomHttpResponse } from '../model/custom-http-response.model';
import { FileUploadStatus } from '../model/file-upload-status.model';
import { User } from '../model/user.model';
import { AuthenticationService } from '../service/authentication.service';
import { NotificationService } from '../service/notification.service';
import { UserService } from '../service/user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
})
export class UserComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  private titleSubject = new BehaviorSubject<string>('Users');
  public titleAction$ = this.titleSubject.asObservable();

  public users: User[];
  public refreshing: boolean;

  public selectedUser: User;

  public userPicture: File;
  public userPictureName: string;

  public userToBeUpdated = new User();
  private currentUsername: string;

  public user: User; // authenticated user

  public uploadPictureStatus = new FileUploadStatus();

  constructor(
    private authenticationService: AuthenticationService,
    private userService: UserService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authenticationService.getUserFromLocalCache();
    this.getUsers(true);
  }

  public changeTitle(title: string): void {
    this.titleSubject.next(title);
  }

  public onSearchUsers(searchName: string): void {
    const usersFound: User[] = [];

    for (const user of this.userService.getUsersFromLocalCache()) {
      if (
        user.firstName.toLowerCase().indexOf(searchName.toLowerCase()) !== -1 ||
        user.lastName.toLowerCase().indexOf(searchName.toLowerCase()) !== -1 ||
        user.username.toLowerCase().indexOf(searchName.toLowerCase()) !== -1 ||
        user.userId.toLowerCase().indexOf(searchName.toLowerCase()) !== -1
      ) {
        usersFound.push(user);
      }
    }

    this.users = usersFound;

    if (usersFound.length === 0 || !searchName) {
      this.users = this.userService.getUsersFromLocalCache();
    }
  }

  public getUsers(showNotification: boolean) {
    this.refreshing = true;

    this.subscriptions.push(
      this.userService.getUsers().subscribe(
        (users: User[]) => {
          this.refreshing = false;

          this.users = users;
          this.userService.addUsersToLocalCache(users);

          if (showNotification) {
            this.sendNotification(
              NotificationType.SUCCESS,
              `${users.length} user(s) loaded successfully`
            );
          }
        },
        (errorResponse: HttpErrorResponse) => {
          this.refreshing = false;

          this.sendNotification(
            NotificationType.SUCCESS,
            errorResponse.error.message
          );
        }
      )
    );
  }

  public saveNewUser(): void {
    this.clickButton('new-user-save');
  }

  public onAddNewUser(newUserForm: NgForm): void {
    const formData = this.userService.createUserFormData(
      null,
      newUserForm.value,
      this.userPicture
    );

    this.subscriptions.push(
      this.userService.addUser(formData).subscribe(
        (response: User) => {
          this.clickButton('new-user-close');

          this.getUsers(false);

          this.userPictureName = null;
          this.userPicture = null;

          newUserForm.reset();

          this.sendNotification(
            NotificationType.SUCCESS,
            `${response.firstName} ${response.lastName} added successfully`
          );
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
          this.userPicture = null;
        }
      )
    );
  }

  public onDeleteUser(username: string): void {
    this.subscriptions.push(
      this.userService.deleteUser(username).subscribe(
        (customHttpResponse: CustomHttpResponse) => {
          this.getUsers(false);

          this.sendNotification(
            NotificationType.SUCCESS,
            customHttpResponse.message
          );
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  public onEditUser(userToBeUpdated: User): void {
    this.userToBeUpdated = userToBeUpdated;
    this.currentUsername = userToBeUpdated.username;
    this.clickButton('openUserEdit');
  }

  public onSelectUser(selectedUser: User): void {
    this.selectedUser = selectedUser;
    this.clickButton('openUserInfo');
  }

  public updateProfileImage(): void {
    this.clickButton('profile-image-input');
  }

  public onUpdateProfileImage(): void {
    const formData = new FormData();
    formData.append('username', this.user.username);
    formData.append('profileImage', this.userPicture);

    this.subscriptions.push(
      this.userService.updateProfileImage(formData).subscribe(
        (event: HttpEvent<any>) => {
          this.reportUploadProgress(event);
        },
        (errorResponse: HttpErrorResponse) => {
          this.uploadPictureStatus.status = 'done';

          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  private reportUploadProgress(event: HttpEvent<any>): void {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        this.uploadPictureStatus.percentage = Math.round(
          (100 * event.loaded) / event.total
        );
        this.uploadPictureStatus.status = 'progress';
        break;
      case HttpEventType.Response:
        if (event.status === 200) {
          this.user.profileImageUrl = `${
            event.body.profileImageUrl
          }?time=${new Date().getTime()}`;

          this.uploadPictureStatus.status = 'done';

          this.sendNotification(
            NotificationType.SUCCESS,
            `${event.body.firstName}\'s profile image updated successfully`
          );

          break;
        } else {
          this.sendNotification(
            NotificationType.SUCCESS,
            `Unable to upload image. Please try again`
          );

          break;
        }
    }
  }

  public onUpdateCurrentUser(user: User): void {
    this.refreshing = true;

    this.currentUsername =
      this.authenticationService.getUserFromLocalCache().username;

    const formData = this.userService.createUserFormData(
      this.currentUsername,
      user,
      this.userPicture
    );

    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe(
        (user: User) => {
          this.refreshing = false;

          this.authenticationService.addUserToLocalCache(user);

          this.getUsers(false);

          this.userPictureName = null;
          this.userPicture = null;

          this.sendNotification(
            NotificationType.SUCCESS,
            `${user.firstName} ${user.lastName} updated successfully`
          );
        },
        (errorResponse: HttpErrorResponse) => {
          this.refreshing = false;
          this.userPicture = null;

          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  public onLogOut(): void {
    this.authenticationService.logOut();

    this.router.navigate(['/login']);

    this.sendNotification(
      NotificationType.SUCCESS,
      `You've been successfully logged out`
    );
  }

  public onProfileImageChange(
    userPictureName: string,
    userPicture: File
  ): void {
    this.userPictureName = userPictureName;
    this.userPicture = userPicture;
  }

  public onUpdateUser() {
    const formData = this.userService.createUserFormData(
      this.currentUsername,
      this.userToBeUpdated,
      this.userPicture
    );

    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe(
        (user: User) => {
          this.clickButton('closeEditUserModalButton');

          this.getUsers(false);

          this.userPictureName = null;
          this.userPicture = null;

          this.sendNotification(
            NotificationType.SUCCESS,
            `${user.firstName} ${user.lastName} updated successfully`
          );
        },
        (errorResponse: HttpErrorResponse) => {
          this.userPictureName = null;
          this.userPicture = null;

          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  public onResetPassword(emailForm: NgForm): void {
    this.refreshing = true;

    const emailAddress = emailForm.value['email'];

    this.subscriptions.push(
      this.userService.resetPassword(emailAddress).subscribe(
        (response: CustomHttpResponse) => {
          this.refreshing = false;

          this.sendNotification(NotificationType.SUCCESS, response.message);
        },
        (errorResponse: HttpErrorResponse) => {
          this.refreshing = false;

          this.sendNotification(
            NotificationType.WARNING,
            errorResponse.error.message
          );
        },
        () => {
          emailForm.reset();
        }
      )
    );
  }

  public resetProfileImage(): void {
    const formData = new FormData();
    formData.append('username', this.user.username);

    this.subscriptions.push(
      this.userService.resetProfileImage(formData).subscribe(
        (event: HttpEvent<any>) => {
          this.reportUploadProgress(event);
        },
        (errorResponse: HttpErrorResponse) => {
          this.uploadPictureStatus.status = 'done';

          this.sendNotification(
            NotificationType.ERROR,
            errorResponse.error.message
          );
        }
      )
    );
  }

  private getUserRole(): string {
    return this.authenticationService.getUserFromLocalCache().role;
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
        'An error occurred. Please try again.'
      );
    }
  }

  private clickButton(buttonId: string): void {
    document.getElementById(buttonId).click();
  }

  public get isUser(): boolean {
    return this.getUserRole() === Role.USER;
  }

  public get isHrOrManager(): boolean {
    return (
      this.getUserRole() === Role.HR || this.getUserRole() === Role.MANAGER
    );
  }

  public get isAdmin(): boolean {
    return this.getUserRole() === Role.ADMIN;
  }

  public get isSuperAdmin(): boolean {
    return this.getUserRole() === Role.SUPER_ADMIN;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
